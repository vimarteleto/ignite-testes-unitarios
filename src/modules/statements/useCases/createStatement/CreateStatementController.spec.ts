import { hash } from "bcryptjs";
import request from "supertest";
import { Connection } from "typeorm";
import { v4 as uuidV4 } from "uuid";
import { app } from "../../../../app";
import createConnection from "../../../../database";

let connection: Connection;

describe("Create statement", () => {
  beforeAll(async () => {
    connection = await createConnection();
    await connection.runMigrations();

    const id = uuidV4();
    const password = await hash("12345678", 8);

    await connection.query(`
      INSERT INTO users(id, name, email, password, created_at, updated_at)
      VALUES('${id}', 'Vinícius Marteleto', 'vinicius@gmail.com', '${password}', 'now()', 'now()')
    `);

    await connection.query(`
      INSERT INTO users(id, name, email, password, created_at, updated_at)
      VALUES('1e8620ae-df52-4f8a-b8ff-6d26f8e4cbaf', 'Maria Luisa Milani', 'maria@gmail.com', '${password}', 'now()', 'now()')
    `);
  });

  afterAll(async () => {
    await connection.dropDatabase();
    await connection.close();
  })

  it("should be able to create a deposit statement", async () => {
    const bearerToken = await request(app).post("/api/v1/sessions")
    .send({
      email: "vinicius@gmail.com",
      password: "12345678",
    });

    const { token } = bearerToken.body;

    const response = await request(app).post("/api/v1/statements/deposit")
    .send({
      amount: 300,
      description: "Depositing $300",
    })
    .set({
      Authorization: `Bearer ${token}`,
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
  });

  it("should be able to create a withdraw statement", async () => {
    const bearerToken = await request(app).post("/api/v1/sessions")
    .send({
      email: "vinicius@gmail.com",
      password: "12345678",
    });

    const { token } = bearerToken.body;

    const response = await request(app).post("/api/v1/statements/withdraw")
    .send({
      amount: 100,
      description: "Withdrawing $100",
    })
    .set({
      Authorization: `Bearer ${token}`,
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
  });

  it("should not be able to create a withdraw statement when the account has insufficient funds", async () => {
    const bearerToken = await request(app).post("/api/v1/sessions")
    .send({
      email: "vinicius@gmail.com",
      password: "12345678",
    });

    const { token } = bearerToken.body;

    const response = await request(app).post("/api/v1/statements/withdraw")
    .send({
      amount: 300,
      description: "Withdrawing $300",
    })
    .set({
      Authorization: `Bearer ${token}`,
    });

    expect(response.status).toBe(400);
  });

  it("should be able to create a transfer", async () => {
    const bearerToken = await request(app).post("/api/v1/sessions")
    .send({
      email: "vinicius@gmail.com",
      password: "12345678",
    });

    const { token } = bearerToken.body;

    const response = await request(app).post(`/api/v1/statements/transfer/1e8620ae-df52-4f8a-b8ff-6d26f8e4cbaf`)
    .send({
      amount: 100,
      description: "Test transfer $100",
    })
    .set({
      Authorization: `Bearer ${token}`,
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
  });

  it("should not be able to create a transfer statement when the account has insufficient funds", async () => {
    const bearerToken = await request(app).post("/api/v1/sessions")
    .send({
      email: "vinicius@gmail.com",
      password: "12345678",
    });

    const { token } = bearerToken.body;

    const response = await request(app).post(`/api/v1/statements/transfer/1e8620ae-df52-4f8a-b8ff-6d26f8e4cbaf`)
    .send({
      amount: 200,
      description: "Test error transfer $200",
    })
    .set({
      Authorization: `Bearer ${token}`,
    });

    expect(response.status).toBe(400);
  });
});