import * as cdk from "aws-cdk-lib";
import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as appsync from "aws-cdk-lib/aws-appsync";
import { Construct } from "constructs";
import * as path from "path";

export class TodoNextjsAppsyncBackendAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB
    const todoTable = new dynamodb.Table(this, "TodoTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
    });

    // AppSync
    const todoApi = new appsync.GraphqlApi(this, "TodoGraphqlApi", {
      name: "todo-graphql-api",
      schema: appsync.SchemaFile.fromAsset(
        path.join(__dirname, "../graphql/schema.graphql")
      ),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: cdk.Expiration.after(cdk.Duration.days(365)),
          },
        },
      },
    });

    // Lambda function
    const commonLambdaNodeJsProps: Omit<
      lambdaNodeJs.NodejsFunctionProps,
      "entry"
    > = {
      handler: "handler",
      environment: {
        TODO_TABLE: todoTable.tableName,
      },
      // runtimeの指定がないとAppSync側でエラーがt出力される。
      runtime: lambda.Runtime.NODEJS_18_X,
    };

    const getTodosLambda = new lambdaNodeJs.NodejsFunction(
      this,
      "getTodosHandler",
      {
        entry: path.join(__dirname, "../lambda/getTodos.ts"),
        // handler: "handler",
        // environment: {
        //   TODO_TABLE: todoTable.tableName,
        // },
        // // runtimeの指定がないとAppSync側でエラーがt出力される。
        // runtime: lambda.Runtime.NODEJS_18_X,
        ...commonLambdaNodeJsProps,
      }
    );
    todoTable.grantReadData(getTodosLambda);

    const addTodoLambda = new lambdaNodeJs.NodejsFunction(
      this,
      "addTodoHandler",
      {
        entry: path.join(__dirname, "../lambda/addTodo.ts"),
        ...commonLambdaNodeJsProps,
      }
    );
    todoTable.grantReadWriteData(addTodoLambda);

    const checkTodoLambda = new lambdaNodeJs.NodejsFunction(
      this,
      "toggleTodoHandler",
      {
        entry: path.join(__dirname, "../lambda/checkTodo.ts"),
        ...commonLambdaNodeJsProps,
      }
    );
    todoTable.grantReadWriteData(checkTodoLambda);

    const deleteTodoLambda = new lambdaNodeJs.NodejsFunction(
      this,
      "deleteTodoHandler",
      {
        entry: path.join(__dirname, "../lambda/deleteTodo.ts"),
        ...commonLambdaNodeJsProps,
      }
    );
    todoTable.grantReadWriteData(deleteTodoLambda);

    // DataSource
    const getTodosDataSource = todoApi.addLambdaDataSource(
      "getTodosDataSource",
      getTodosLambda
    );

    const addTodoDataSource = todoApi.addLambdaDataSource(
      "addTodoDataSource",
      addTodoLambda
    );

    const checkTodoDataSource = todoApi.addLambdaDataSource(
      "toggleTodoDataSource",
      checkTodoLambda
    );

    const deleteTodoDataSource = todoApi.addLambdaDataSource(
      "deleteTodoDataSource",
      deleteTodoLambda
    );

    // addTodoDataSource.createResolver({
    //   typeName: "Mutation",
    //   fieldName: "addTodo",
    // });

    new appsync.Resolver(this, "QueryGetTodosResolver", {
      api: todoApi,
      dataSource: getTodosDataSource,
      typeName: "Query",
      fieldName: "getTodos",
    });

    new appsync.Resolver(this, "MutationAddTodoResolver", {
      api: todoApi,
      dataSource: addTodoDataSource,
      typeName: "Mutation",
      fieldName: "addTodo",
    });

    new appsync.Resolver(this, "MutationCheckTodoResolver", {
      api: todoApi,
      dataSource: checkTodoDataSource,
      typeName: "Mutation",
      fieldName: "checkTodo",
    });

    new appsync.Resolver(this, "MutationDeleteTodoResolver", {
      api: todoApi,
      dataSource: deleteTodoDataSource,
      typeName: "Mutation",
      fieldName: "deleteTodo",
    });

    // CfnOutput
    new cdk.CfnOutput(this, "GraphQlApiUrl", {
      value: todoApi.graphqlUrl,
    });

    new cdk.CfnOutput(this, "GraphQlApiKey", {
      value: todoApi.apiKey || "",
    });
  }
}
