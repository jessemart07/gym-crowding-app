// @ts-nocheck
import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

export class GymCrowdingStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const apiLambda = new NodejsFunction(this, "GymCrowdingApiFn", {
      runtime: Runtime.NODEJS_22_X,
      memorySize: 512,
      timeout: Duration.seconds(10),
      entry: "backend/src/lambda.ts",
      handler: "handler",
      bundling: {
        minify: true,
        externalModules: ["aws-sdk"],
      },
      environment: {
        NODE_ENV: "production",
      },
    });

    const api = new HttpApi(this, "GymCrowdingHttpApi", {
      apiName: "gym-crowding-api",
    });

    const integration = new HttpLambdaIntegration("GymCrowdingIntegration", apiLambda);

    api.addRoutes({
      path: "/api/{proxy+}",
      methods: [HttpMethod.ANY],
      integration,
    });
  }
}
