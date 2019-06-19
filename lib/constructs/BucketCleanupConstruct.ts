import lambda = require('@aws-cdk/aws-lambda')
import s3 = require('@aws-cdk/aws-s3')
import cdk = require('@aws-cdk/cdk');
import cloudformation = require('@aws-cdk/aws-cloudformation')

export interface BucketCleanupFunctionProps {
  bucket: s3.IBucket
}

export class BucketCleanupFunction extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: BucketCleanupFunctionProps) {
    super(scope, id)

    const cleanupLambda = new lambda.Function(this, 'BucketCleanupLambda', {
      handler: 'index.handler',
      runtime: lambda.Runtime.Python37,
      code: new lambda.InlineCode(`
import json
import boto3
from botocore.vendored import requests

def lambda_handler(event, context):
    try:
        bucket = event['ResourceProperties']['BucketName']

        if event['RequestType'] == 'Delete':
            s3 = boto3.resource('s3')
            bucket = s3.Bucket(bucket)
            for obj in bucket.objects.filter():
                s3.Object(bucket.name, obj.key).delete()

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

    const custom = new cloudformation.CfnCustomResource(this,'', {
      serviceToken: cleanupLambda.functionArn,
    })

    custom.addPropertyOverride('BucketName', props.bucket.bucketName)
    custom.addDependsOn(props.bucket.node.findChild('Resource') as s3.CfnBucket)
  }
}