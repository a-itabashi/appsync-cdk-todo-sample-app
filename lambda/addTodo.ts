import { AppSyncResolverHandler } from "aws-lambda";
import {
  MutationAddTodoArgs,
  Todo,
} from "../graphql/generated/generated-types";
import { DynamoDB } from "aws-sdk";
import { v4 } from "uuid";

const docClient = new DynamoDB.DocumentClient();

export const handler: AppSyncResolverHandler<
  MutationAddTodoArgs,
  Todo | null
> = async (event) => {
  const addTodoInput = event.arguments.addTodoInput;
  const uuid = v4();

  try {
    if (!process.env.TODO_TABLE) {
      console.log("TODO_TABLE was not specified");
      return null;
    }

    const newTodo: Todo = {
      id: uuid,
      ...addTodoInput,
      completed: false,
      createdAt: Date.now(),
    };

    await docClient
      .put({
        TableName: process.env.TODO_TABLE,
        Item: newTodo,
      })
      .promise();
    return newTodo;
  } catch (err) {
    console.error(`DynamoDB error: ${err}`);
    return null;
  }
};
