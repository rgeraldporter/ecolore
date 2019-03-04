const S3 = require('aws-sdk/clients/s3');
const R = require('ramda');
const fs = require('fs-extra');
const { Maybe } = require('simple-maybe');

const AWS_S3_VERSION = '2006-03-01'; // yes, that's right. It's an old API.
const ARCHIVE_ORG_META_PREFIX =
    process.env.ARCHIVE_ORG_META_PREFIX || 'ecolore';

const s3 = new S3({
    apiVersion: AWS_S3_VERSION,
    endpoint: 'http://s3.us.archive.org',
    accessKeyId: process.env.ARCHIVE_ORG_ACCESS_KEY, // @todo; keys via DB! can only upload to one acct
    secretAccessKey: process.env.ARCHIVE_ORG_SECRET_KEY,
    signatureVersion: 'v2',
    s3ForcePathStyle: true
});

// side effects
const addHeader = req => header => {
    req.httpRequest.headers[R.prop('key', header)] = R.prop('value', header);
};

const createMetaHeader = ({ key, value }) => ({
    key: `x-archive-meta-${key}`,
    value
});

const buildBucketName = data =>
    `${ARCHIVE_ORG_META_PREFIX}-${data.projectSlug}-o-${data.observationId}`;

const makeRequest = (file, data) => headers => {
    const bucketReq = s3.createBucket({
        Bucket: buildBucketName(data)
    });

    bucketReq.httpRequest.headers['x-archive-ignore-preexisting-bucket'] = 1;
    headers.forEach(addHeader(bucketReq));

    const req = s3.putObject({
        Bucket: buildBucketName(data),
        Key: data.clipFilename,
        Body: file
    });

    return bucketReq.promise().then(() => req.promise());
};

const prefixKey = key => `${ARCHIVE_ORG_META_PREFIX}--${key}`;

const objKeyToHeaderKey = data => ({
    collection: data.collection,
    creator: data.creator,
    date: data.date,
    description: data.description,
    licenseurl: data.licenseurl,
    mediatype: data.mediatype,
    subject: data.subject,
    title: data.title,
    [prefixKey('upload-origin-host')]: process.env.HOST,
    [prefixKey('observation-id')]: data.observationId,
    [prefixKey('project-name')]: data.projectName,
    [prefixKey('project-slug')]: data.projectSlug,
    [prefixKey('local-date-time')]: data.datetime,
    [prefixKey('location-code')]: data.locationCode,
    [prefixKey('location')]: data.location,
    [prefixKey('device-id')]: data.deviceId,
    [prefixKey('derived-from-filename')]: data.filename,
    [prefixKey('derived-from-archive-org-url')]: data.archiveUrl,
    [prefixKey(
        'derived-from-archive-org-contextual-url'
    )]: data.archiveUrlContext,
    [prefixKey('label-text')]: data.labelText,
    [prefixKey('identification-text')]: data.identification,
    [prefixKey('identifier-credit')]: data.submitterName,
    [prefixKey('frequency-floor')]: data.frequencyFloor,
    [prefixKey('frequency-ceiling')]: data.frequencyCeiling,
    [prefixKey('duration')]: data.duration
});

const buildRequest = ({ data, file }) /* : S3Request */ =>
    Maybe.of(data)
        .map(objKeyToHeaderKey)
        .map(a =>
            Object.keys(a).map(key => createMetaHeader({ key, value: a[key] }))
        )
        .fork(console.error, makeRequest(file, data));

const uploadToArchiveOrg = ({ data, filePath }) =>
    fs
        .readFile(filePath)
        .then(fileData => buildRequest({ data, file: fileData }))
        .then(response => {
            console.log(response);
            return response;
        })
        .catch(err => {
            console.error('err', err);
            return err;
        });

module.exports = {
    uploadToArchiveOrg,
    buildBucketName
};
