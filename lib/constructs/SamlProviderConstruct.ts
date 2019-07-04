import iam = require('@aws-cdk/aws-iam')
import cdk = require('@aws-cdk/core');
import lambda = require('@aws-cdk/aws-lambda')
import cloudformation = require('@aws-cdk/aws-cloudformation')

export interface SamlProviderProps {
  readonly metadataDocument: string;
}


export class SamlProvider extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: SamlProviderProps) {
    super(scope, id)

    const samlProviderHandler = new lambda.Function(this, 'samlProviderHandler', {
      handler: 'index.lambda_handler',
      runtime: lambda.Runtime.PYTHON_3_7,
      code: new lambda.InlineCode(`
import json
import boto3
from botocore.vendored import requests

def lambda_handler(event, context):
    try:
        client = boto3.client('iam')
        if event['RequestType'] == 'Create':
            response = client.create_saml_provider(
                SAMLMetadataDocument = event['ResourceProperties']['MetadataDocument'],
                Name = event['ResourceProperties']['ProviderName']
            )
            sendResponseCfn(event,context, "SUCCESS", response['SAMLProviderArn'])

        elif event['RequestType'] == 'Delete':
            client.delete_saml_provider(
                SAMLProviderArn=event['PhysicalResourceId']
            )
            sendResponseCfn(event,context, "SUCCESS", event['PhysicalResourceId'])
        elif event['RequestType'] == 'Update':
            client.update_saml_provider(
                SAMLMetadataDocument = event['ResourceProperties']['MetadataDocument'],
                SAMLProviderArn=event['PhysicalResourceId']
            )
            sendResponseCfn(event,context, "SUCCESS", event['PhysicalResourceId'])
        else:
            console.log('Unknown RequestType: ' + event['RequestType'])
            sendResponseCfn(event, context, "FAILED", event['PhysicalResourceId'] if 'PhysicalResourceId' in event else 'NaN')

    except Exception as e:
        print(e)
        sendResponseCfn(event, context, "FAILED", event['PhysicalResourceId'] if 'PhysicalResourceId' in event else 'NaN')


def sendResponseCfn(event, context, responseStatus, resourceId):
    response_body = {'Status': responseStatus,
                     'Reason': 'Log stream name: ' + context.log_stream_name,
                     'PhysicalResourceId': resourceId,
                     'StackId': event['StackId'],
                     'RequestId': event['RequestId'],
                     'LogicalResourceId': event['LogicalResourceId'],
                     'Data': json.loads("{}")}

    requests.put(event['ResponseURL'], data=json.dumps(response_body))
     `)
    })

    samlProviderHandler.role!.addToPolicy(new iam.PolicyStatement({
      actions: [
        'iam:UpdateSAMLProvider',
        'iam:CreateSAMLProvider',
        'iam:DeleteSAMLProvider',
      ],
      resources: ['*'],
    }))

    const custom = new cloudformation.CfnCustomResource(this, 'SamlProvider', {
      serviceToken: samlProviderHandler.functionArn,
    })

    custom.addPropertyOverride('MetadataDocument', props.metadataDocument)
    custom.addPropertyOverride('ProviderName', id)
  }
}
