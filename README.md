# Ventx AWS CDK Library <!-- omit in toc -->

A collection of usefull AWS CDK Constructs. To learn more about the AWS CDK checkout the [aws-cdk github repo](https://github.com/awslabs/aws-cdk)

## Contents  <!-- omit in toc -->

- [Installation](#Installation)
- [Components](#Components)
  - [BucketCleanupFunction](#BucketCleanupFunction)
  - [SamlProvider](#SamlProvider)

## Installation

| Language   | install package                             | import                                                |
|------------|---------------------------------------------|-------------------------------------------------------|
| python     | `pip install ventx.aws-cdk-library`         | ```from ventx import aws_cdk_library as vlib```       |
| typescrupt | `npm install --save @ventx/aws-cdk-library` | ```import vlib = require('@ventx/aws-cdk-library')``` |

## Components

The library contains the following components

### BucketCleanupFunction

A AWS CloudFormation custom resource that deletes all files from a s3 bucket when the stack is deleted. This allows CloudFormation to delete the Bucket even when it has contents. __Attention:__ This may cause your data to be lost if you do not know what you are doing!

__Usage - Python:__

```python
        # attach the cleanup function to a bucket you want to be emptied when the stack is deleted
        vlib.BucketCleanupFunction(self, 'jsonFileBucketCleanup', bucket=YourBucketToBeEmptied)
```

__Usage - Typescript:__

```typescript
new vlib.BucketCleanupFunction(this, 'bucketCleanupFunction', {
        bucket: YourBucketToBeEmptied
})
```

### SamlProvider

The `SamlProvider` Construct adds support for the iam.SamlProvider resource, which is not supported by cloudformation at the moment.

__Usage - Python:__

```python
        with open("SAML.xml", encoding="utf8") as fp:
            metadata = fp.read()

        vlib.SamlProvider(this, 'samlProviderTest',metadataDocument=metadata)
```

__Usage - Typescript:__

```typescript
    const metadata = fs.readFileSync('SAML.xml', 'utf8')

    const samlProvider = new vlib.SamlProvider(this, 'samlProviderTest', {
      metadataDocument: metadata
    })
```
