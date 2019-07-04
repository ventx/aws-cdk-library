import lambda = require('@aws-cdk/aws-lambda')
import cdk = require('@aws-cdk/core');
import cloudformation = require('@aws-cdk/aws-cloudformation')
import ecr = require('@aws-cdk/aws-ecr')

export interface EcrCleanupFunctionProps {
  repository: ecr.Repository;
}

export class BucketCleanupFunction extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: EcrCleanupFunctionProps) {
    super(scope, id)

    const cleanupLambda = new lambda.Function(this, 'BucketCleanupLambda', {
      handler: 'index.lambda_handler',
      runtime: lambda.Runtime.PYTHON_3_7,
      code: new lambda.InlineCode(`
import json
import boto3
from botocore.vendored import requests

def lambda_handler(event, context):
    try:
        repositoryArn = event['ResourceProperties']['RepositoryArn']

        

        sendResponseCfn(event, context, "SUCCESS")
    except Exception as e:
        print(e)
        sendResponseCfn(event, context, "FAILED")


def sendResponseCfn(event, context, responseStatus):
    response_body = {'Status': responseStatus,
                     'Reason': 'Log stream name: ' + context.log_stream_name,
                     'PhysicalResourceId': context.log_stream_name,
                     'StackId': event['StackId'],
                     'RequestId': event['RequestId'],
                     'LogicalResourceId': event['LogicalResourceId'],
                     'Data': json.loads("{}")}

    requests.put(event['ResponseURL'], data=json.dumps(response_body))
     `)
    })

    const custom = new cloudformation.CfnCustomResource(this,'CleanupFunctionCustomResource', {
      serviceToken: cleanupLambda.functionArn,
    })

    custom.addPropertyOverride('RepositoryArn', props.repository.repositoryArn)
    custom.addDependsOn(props.repository.node.defaultChild as cdk.CfnResource)
  }
}