import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import sns = require('@aws-cdk/aws-sns');
import lambda = require('@aws-cdk/aws-lambda');
import eventSources = require('@aws-cdk/aws-lambda-event-sources')
import iam = require('@aws-cdk/aws-iam')
import autoscaling = require('@aws-cdk/aws-autoscaling')

export interface BastionHostProps {
  readonly vpc: ec2.IVpc
  readonly instanceType?: ec2.InstanceType;
  readonly image: ec2.IMachineImage;
  readonly peers: ec2.IPeer[];
  readonly keyName: string;
  readonly subnets?: ec2.SubnetSelection;
}
export class BastionHost extends cdk.Construct {
  readonly internalSshSecurityGroup: ec2.ISecurityGroup
  readonly publicIp: string

  constructor(scope: cdk.Construct, id: string, props: BastionHostProps) {
    super(scope, id)

    const externalSshSG = this.createAllowExternSshSG(props.vpc, props.peers)
    this.internalSshSecurityGroup = this.createAllowInternalSshSG(props.vpc)
    const snsTopic = new sns.Topic(this, 'autoscaling-notifications')
    const externalIp = new ec2.CfnEIP(this, 'bastionhost-ip')

    this.publicIp = externalIp.ref
    this.createLambda(snsTopic, externalIp.ref)
    this.createAutoScalingGroup(this.internalSshSecurityGroup, externalSshSG, {
      vpc: props.vpc,
      allowAllOutbound: true,
      associatePublicIpAddress: false,
      keyName: props.keyName,
      notificationsTopic: snsTopic,
      instanceType: props.instanceType ? props.instanceType : new ec2.InstanceType('t3.micro'),
      machineImage: props.image,
      vpcSubnets: props.subnets ? props.subnets : {
        onePerAz: true,
        subnetType: ec2.SubnetType.PUBLIC
      }
    })
  }

  private createAutoScalingGroup(internalSshSG: ec2.ISecurityGroup, externalSshSG: ec2.ISecurityGroup, asgProps: autoscaling.AutoScalingGroupProps) {
    const autoScalingGroup = new autoscaling.AutoScalingGroup(this, 'bastion-selfheal-ASG', asgProps)

    autoScalingGroup.addSecurityGroup(internalSshSG)
    autoScalingGroup.addSecurityGroup(externalSshSG)
  }

  private createLambda(topic: sns.ITopic, ip: string) {
    new lambda.Function(this, "AutoScalingAttachIpLambda", {
      events: [new eventSources.SnsEventSource(topic)],
      code: this.createLambdaCode(ip),
      runtime: lambda.Runtime.NODEJS_8_10,
      handler: "index.handler",
      role: this.createLambdaRole()
    })
  }

  private createLambdaRole(): iam.Role {
    const lambdaDocument = new iam.PolicyDocument();
    const associateAddressStatement = new iam.PolicyStatement();
    associateAddressStatement.addActions("ec2:AssociateAddress");
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
        "AllowAssociateAddress": lambdaDocument
      }
    })
  }

  private createLambdaCode(publicIpAddress: string): lambda.Code {
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
            console.log(\`associate Address \${instanceId} with ${publicIpAddress}\`);
            ec2.associateAddress({
                InstanceId: instanceId,
                PublicIp: "${publicIpAddress}"
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


  private createAllowInternalSshSG(vpc: ec2.IVpc): ec2.SecurityGroup {
    const securityGroup = new ec2.SecurityGroup(this, 'allow-ssh-internal-SG', {
      vpc: vpc
    })

    securityGroup.addIngressRule(securityGroup, new ec2.Port({ fromPort: 22, toPort: 22, stringRepresentation: '22', protocol: ec2.Protocol.TCP }))
    return securityGroup
  }

  private createAllowExternSshSG(vpc: ec2.IVpc, peers: ec2.IPeer[]): ec2.SecurityGroup {
    const sshSecurityGroup = new ec2.SecurityGroup(this, 'allow-ssh-external-SG', {
      vpc: vpc
    })

    peers.forEach(peer => {
      sshSecurityGroup.addIngressRule(peer, new ec2.Port({ fromPort: 22, toPort: 22, stringRepresentation: '22', protocol: ec2.Protocol.TCP }))
    });

    return sshSecurityGroup
  }
}