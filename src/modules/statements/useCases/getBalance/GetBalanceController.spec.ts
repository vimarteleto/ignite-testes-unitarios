import { hash } from "bcryptjs";
import request from "supertest";
import { Connection } from "typeorm";
import { v4 as uuidV4 } from "uuid";
import { app } from "../../../../app";
import createConnection from "../../../../database";

let connection: Connection;

describe("Get balance", () => {
  beforeAll(async () => {
    connection = await createConnection();
    await connection.runMigrations();

    const password = await hash("12345678", 8);

    await connection.query(`
      INSERT INTO users(id, name, email, password, created_at, updated_at)
      VALUES('1e8620ae-df52-4f8a-b8ff-6d26f8e4cbaf', 'Vinícius Marteleto', 'vinicius@gmail.com', '${password}', 'now()', 'now()')
    `);

    await connection.query(`
      INSERT INTO users(id, name, email, password, created_at, updated_at)
      VALUES('1c4b6a61-2b39-4bed-8354-876830ef0cf6', 'Maria Luisa Milani', 'maria@gmail.com', '${password}', 'now()', 'now()')
    `);
  });

  afterAll(async () => {
    await connection.dropDatabase();
    await connection.close();
  })

  it("should be able to get account balance", async () => {
    const bearerToken1 = await request(app).post("/api/v1/sessions")
    .send({
      email: "user01@test.com",
      password: "12345678",
    });
    const { token } = bearerToken1.body;

    await request(app).post("/api/v1/statements/deposit")
    .send({
      amount: 300,
      description: "Depositing $300",
    })
    .set({
      Authorization: `Bearer ${token}`,
    });

    await request(app).post("/api/v1/statements/withdraw")
    .send({
      amount: 100,
      description: "Withdrawing $100",
    })
    .set({
      Authorization: `Bearer ${token}`,
    });

    await request(app).post(`/api/v1/statements/transfer/1c4b6a61-2b39-4bed-8354-876830ef0cf6`)
    .send({
      amount: 100,
      description: "Test transfer $100",
    })
    .set({
      Authorization: `Bearer ${token}`,
    });

    const bearerToken2 = await request(app).post("/api/v1/sessions")
    .send({
      email: "user02@test.com",
      password: "12345678",
    });

    await request(app).post("/api/v1/statements/deposit")
    .send({
      amount: 200,
      description: "Depositing $200",
    })
    .set({
      Authorization: `Bearer ${bearerToken2.body.token}`,
    });

    await request(app).post(`/api/v1/statements/transfer/1e8620ae-df52-4f8a-b8ff-6d26f8e4cbaf`)
    .send({
      amount: 150,
      description: "Test transfer $150",
    })
    .set({
      Authorization: `Bearer ${bearerToken2.body.token}`,
    });

    const response = await request(app)
    .get("/api/v1/statements/balance")
    .set({
      Authorization: `Bearer ${token}`,
    });

    expect(response.status).toBe(200);
  });
});