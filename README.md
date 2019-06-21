# Ventx AWS CDK Library

A collection of usefull AWS CDK Constructs. To learn more about the AWS CDK checkout the [aws-cdk github repo](https://github.com/awslabs/aws-cdk)

## Components

The library contains the following components

### BucketCleanupFunction

A AWS CloudFormation custom resource that deletes all files from a s3 bucket when the stack is deleted. This allows CloudFormation to delete the Bucket even when it has contents. __Attention:__ This may cause your data to be lost if you do not know what you are doing!

