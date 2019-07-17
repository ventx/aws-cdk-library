import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2')
import autoscaling = require('@aws-cdk/aws-autoscaling')
import sns = require('@aws-cdk/aws-sns');
import lambda = require('@aws-cdk/aws-lambda');
import eventSources = require('@aws-cdk/aws-lambda-event-sources')
import iam = require('@aws-cdk/aws-iam')

export interface PrivateIpAttachmentProps {
  readonly networkInterface: ec2.CfnNetworkInterface
  readonly asg: autoscaling.AutoScalingGroup
}

export class PrivateIpAttachment extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: PrivateIpAttachmentProps) {
    super(scope, id)

    let topic = new sns.Topic(this, 'autoScalingNotifications')
    this.createFunction(topic, props.networkInterface)

  }

  private createFunction(topic: sns.ITopic, networkInterface: ec2.CfnNetworkInterface) {
    new lambda.Function(this, "AutoScalingAttachIpLambda", {
      events: [new eventSources.SnsEventSource(topic)],
      code: this.createLambdaCode(networkInterface),
      runtime: lambda.Runtime.NODEJS_8_10,
      handler: "index.handler",
      role: this.createLambdaRole()
    })
  }

  private createLambdaRole(): iam.Role {
    const lambdaDocument = new iam.PolicyDocument();
    const associateAddressStatement = new iam.PolicyStatement();
    associateAddressStatement.addActions("ec2:AttachNetworkInterface");
    associateAddressStatement.addResources("*");
    const logStatement = new iam.PolicyStatement()
    logStatement.addActions("logs:CreateLogGroup");
    logStatement.addActions("logs:CreateLogStream");
    logStatement.addActions("logs:PutLogEvents");
    logStatement.addResources("*")
    lambdaDocument.addStatements(associateAddressStatement);
    lambdaDocument.addStatements(logStatement)

    const trustDocument = new iam.PolicyDocument();
    const trustStatement = new iam.PolicyStatement();
    trustStatement.addActions("sts:AssumeRole");
    trustDocument.addStatements(trustStatement);

    return new iam.Role(this, "LambdaExecutionRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      inlinePolicies: {
        "AllowAttachNetworkInterce": lambdaDocument
      }
    })
  }

  private createLambdaCode(networkInterface: ec2.CfnNetworkInterface): lambda.Code {
    return lambda.Code.inline(`
    var AWS = require('aws-sdk');
    AWS.config.update({region: 'eu-central-1'});
    
    exports.handler = (event,context,callback) => {
    
        console.log(event.Records[0].Sns.Message)
        const message = JSON.parse(event.Records[0].Sns.Message);
        console.log(message.Event)
        
        if(message.Event === "autoscaling:EC2_INSTANCE_LAUNCH")
        {
            const instanceId = message.EC2InstanceId
            var ec2 = new AWS.EC2({apiVersion: '2016-11-15'});
            console.log(\`associate Address \${instanceId} with ${networkInterface.logicalId}\`);
            ec2.attachNetworkInterface({
                InstanceId: instanceId,
                NetworkInterfaceId: "${networkInterface.logicalId}",
                DeviceIndex: 1
            }, function(err,data) {
                if(err)
                {
                    callback(err)
                }
                else
                {
                    callback(null,data)
                }
            })
        }
    };
`)
  }
}