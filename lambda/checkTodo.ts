import { AppSyncResolverHandler } from "aws-lambda";
import {
  MutationCheckTodoArgs,
  Todo,
} from "../graphql/generated/generated-types";
import { DynamoDB } from "aws-sdk";

const docClient = new DynamoDB.DocumentClient();

export const handler: AppSyncResolverHandler<
  MutationCheckTodoArgs,
  Todo | null
> = async (event) => {
  const toggleTodoInput = event.arguments.checkTodoInput;

  try {
    if (!process.env.TODO_TABLE) {
      console.log("TODO_TABLE was not specified");
      return null;
    }

    const data = await docClient
      .update({
        TableName: process.env.TODO_TABLE,
        Key: {
          id: toggleTodoInput.id,
        },
        UpdateExpression: "set completed = :c",
        ExpressionAttributeValues: {
          ":c": toggleTodoInput.completed,
        },
        ReturnValues: "ALL_NEW",
      })
      .promise();
    return data.Attributes as Todo;
  } catch (err) {
    console.error(`DynamoDB error: ${err}`);
    return null;
  }
};
