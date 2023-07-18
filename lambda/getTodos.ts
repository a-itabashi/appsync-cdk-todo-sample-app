import { AppSyncResolverHandler } from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import { Todo } from "../graphql/generated/generated-types";

const docClient = new DynamoDB.DocumentClient();

export const handler: AppSyncResolverHandler<
  null,
  Todo[] | null
> = async () => {
  try {
    if (!process.env.TODO_TABLE) {
      console.log("TODO_TABLE was not specified");
      return null;
    }

    const data = await docClient
      .scan({ TableName: process.env.TODO_TABLE })
      .promise();

    return data.Items as Todo[];
  } catch (err) {
    console.error(`DynamoDB error: ${err}`);
    return null;
  }
};
