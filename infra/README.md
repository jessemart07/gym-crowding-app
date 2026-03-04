# Infrastructure Snippet (AWS CDK)

This folder contains a TypeScript CDK snippet for deploying the Fastify API behind:

- AWS Lambda (`NodejsFunction`) pointing to `backend/src/lambda.ts`
- API Gateway HTTP API route `/api/{proxy+}`

See `infra/cdk/gym-crowding-stack.ts`.

## Notes

- For production you would add:
  - CloudWatch alarms and dashboards
  - WAF and auth (Cognito/JWT)
  - environment config via SSM/Secrets Manager
  - CI/CD pipeline and multi-environment stacks
