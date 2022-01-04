import { InMemoryUsersRepository } from "../../../users/repositories/in-memory/InMemoryUsersRepository";
import { AuthenticateUserUseCase } from "../../../users/useCases/authenticateUser/AuthenticateUserUseCase";
import { CreateUserUseCase } from "../../../users/useCases/createUser/CreateUserUseCase";
import { ICreateUserDTO } from "../../../users/useCases/createUser/ICreateUserDTO";
import { OperationType } from "../../entities/Statement";
import { InMemoryStatementsRepository } from "../../repositories/in-memory/InMemoryStatementsRepository";
import { CreateStatementError } from "./CreateStatementError";
import { CreateStatementUseCase } from "./CreateStatementUseCase";

let createStatementUseCase: CreateStatementUseCase;
let inMemoryUsersRepository: InMemoryUsersRepository;
let inMemoryStatementsRepository: InMemoryStatementsRepository;
let createUserUseCase: CreateUserUseCase;
let authenticateUserUseCase: AuthenticateUserUseCase;

describe("Create a statement", () => {
  beforeEach(() => {
    inMemoryUsersRepository = new InMemoryUsersRepository();
    inMemoryStatementsRepository = new InMemoryStatementsRepository();
    createStatementUseCase = new CreateStatementUseCase(
      inMemoryUsersRepository,
      inMemoryStatementsRepository
    );
    createUserUseCase = new CreateUserUseCase(inMemoryUsersRepository);
    authenticateUserUseCase = new AuthenticateUserUseCase(inMemoryUsersRepository);
  });

  it("should be able to create a deposit", async () => {
    const user: ICreateUserDTO = {
      name: "Vinícius Marteleto",
      email: "vinicius@gmail.com",
      password: "12345678",
    };
    await createUserUseCase.execute(user);

    const token = await authenticateUserUseCase.execute({
      email: user.email,
      password: user.password,
    });

    const statement = await createStatementUseCase.execute({
      user_id: token.user.id as string,
      type: OperationType.DEPOSIT,
      amount: 100,
      description: "Depositing $100",
    });

    expect(statement).toHaveProperty("id");
    expect(statement.amount).toEqual(100);
  });

  it("should be able to create a withdraw", async () => {
    const user: ICreateUserDTO = {
      name: "Vinícius Marteleto",
      email: "vinicius@gmail.com",
      password: "12345678",
    };
    await createUserUseCase.execute(user);

    const token = await authenticateUserUseCase.execute({
      email: user.email,
      password: user.password,
    });

    await createStatementUseCase.execute({
      user_id: token.user.id as string,
      type: OperationType.DEPOSIT,
      amount: 100,
      description: "Depositing $100",
    });

    const withdraw = await createStatementUseCase.execute({
      user_id: token.user.id as string,
      type: OperationType.WITHDRAW,
      amount: 60,
      description: "Withdrawing $60",
    });

    expect(withdraw).toHaveProperty("id");
  });

  it("should not be able to create a statement for a invalid user", () => {
    expect(async () => {
      await createStatementUseCase.execute({
        user_id: "invalid",
        type: OperationType.DEPOSIT,
        amount: 500,
        description: "Depositing $500",
      });
    }).rejects.toBeInstanceOf(CreateStatementError.UserNotFound);
  });

  it("should not be able to create a withdraw with insufficient funds", async () => {
    const user = await createUserUseCase.execute({
      name: "Vinícius Marteleto",
      email: "vinicius@gmail.com",
      password: "12345678",
    });

    await createStatementUseCase.execute({
      user_id: user.id as string,
      type: OperationType.DEPOSIT,
      amount: 50,
      description: "Depositing $50",
    });

    await expect(createStatementUseCase.execute({
        user_id: user.id as string,
        type: OperationType.WITHDRAW,
        amount: 100,
        description: "Withdrawing $100",
      })).rejects.toEqual(new CreateStatementError.InsufficientFunds());
  });

  it("should be able to create a transfer", async () => {
    const user01 = await createUserUseCase.execute({
      name: "Vinícius Marteleto",
      email: "vinicius@gmail.com",
      password: "12345678"
    })
    
    const user02 = await createUserUseCase.execute({
      name: "Maria Luisa Milani",
      email: "maria@gmail.com",
      password: "12345678"
    })

    await createStatementUseCase.execute({
      user_id: user01.id as string,
      type: OperationType.DEPOSIT,
      amount: 100,
      description: "Depositing $100",
    });

    const statement = await createStatementUseCase.execute({
      user_id: user02.id as string,
      sender_id: user01.id as string,
      type: OperationType.TRANSFER,
      amount: 50,
      description: "Transfer $50 to User 02",
    });

    expect(statement).toHaveProperty("id");
    expect(statement.amount).toEqual(50);
  });
});