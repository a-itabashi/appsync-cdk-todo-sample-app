import { AppSyncResolverHandler } from "aws-lambda";
import { MutationDeleteTodoArgs } from "../graphql/generated/generated-types";
import { DynamoDB } from "aws-sdk";

const docClient = new DynamoDB.DocumentClient();

export const handler: AppSyncResolverHandler<
  MutationDeleteTodoArgs,
  Boolean | null
> = async (event) => {
  const id = event.arguments.id;

  try {
    if (!process.env.TODO_TABLE) {
      console.log("TODO_TABLE was not specified");
      return null;
    }
    await docClient
      .delete({
        TableName: process.env.TODO_TABLE,
        Key: { id: id },
      })
      .promise();
    return true;
  } catch (err) {
    console.error(`DynamoDB error: ${err}`);
    return null;
  }
};
