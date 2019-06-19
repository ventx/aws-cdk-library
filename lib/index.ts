import sns = require('@aws-cdk/aws-sns');
import sqs = require('@aws-cdk/aws-sqs');
import cdk = require('@aws-cdk/cdk');

export interface AwsCdkLibraryProps {
  /**
   * The visibility timeout to be configured on the SQS Queue, in seconds.
   *
   * @default 300
   */
  visibilityTimeout?: number;
}

export class AwsCdkLibrary extends cdk.Construct {
  /** @returns the ARN of the SQS queue */
  public readonly queueArn: string;

  constructor(scope: cdk.Construct, id: string, props: AwsCdkLibraryProps = {}) {
    super(scope, id);

    const queue = new sqs.Queue(this, 'AwsCdkLibraryQueue', {
      visibilityTimeoutSec: props.visibilityTimeout || 300
    });

    const topic = new sns.Topic(this, 'AwsCdkLibraryTopic');

    topic.subscribeQueue(queue);

    this.queueArn = queue.queueArn;
  }
}
