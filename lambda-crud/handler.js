'use strict';
const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
//const uuid = require('uuid/v4');
const { v4: uuidv4 } = require('uuid');

const postTable = process.env.POSTS_TABLE;

// Helper function to costruct the response
function response(statusCode, message) {
  return {
    statusCode: statusCode,
    body: JSON.stringify(message)
  };
}

module.exports.createPost = (event, context, callback) => {
  
  console.log(event);
  
  const reqBody = JSON.parse(event.body);
  
  if(!reqBody.title 
    || reqBody.title.trim() === '' 
    || !reqBody.body 
    || reqBody.body === ''
    || !reqBody.userId 
    || reqBody.userId === '') {
      new callback(null, response(400, { error: 'Missing title or body.'}));
    }

  const post = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    userId: reqBody.userId,
    title: reqBody.title,
    body: reqBody.body
  };
  
  return db.put({
    TableName: postTable,
    Item: post
  })
  .promise().then(() => {
    console.log("SUCCESS");
    callback(null, response(201, post));
  })
  .catch(err => {
    console.log(err);
    callback(null, response(err.statusCode, err));
  });
}

//Update a post
module.exports.updatePost = (event, context, callback) => {

  const id = event.pathParameters.id;
  const body = JSON.parse(event.body);
  const paramName = body.paramName;
  const paramValue = body.paramValue;

  const params = {
    Key: {
      id: id
    },
    TableName: postTable,
    ConditionExpression: 'attribute_exists(id)',
    UpdateExpression: 'set ' + paramName + ' = :v',
    ExpressionAttribute: {
      ':v': paramValue
    },
    ReturnValue: 'ALL_NEW'
  }

  return db.update(params)
    .promise()
    .then(res => {
      console.log("SUCCESS");
      callback(null, response(200, res))
    })
    .catch(err => callback(null, response(err.statusCode, err)));
}

//Delete a post
module.exports.deletePost = (event, context, callback) => {

  const id = event.pathParameters.id;
  
  const params = {
    Key: {
      id: id
    },
    TableName: postTable
  };

  return db.delete(params)
    .promise()
    .then(() => {
      console.log("SUCCESS");
      callback(null, response(200, { message: 'Post deleted successfully.'}));
    })
    .catch(err => callback(null, response(err.statusCode, err)));
}

//Get all posts
module.exports.getAllPosts = (event, context, callback) => {
  return db.scan({
    TableName: postTable
  })
  .promise()
  .then(res => {
    console.log("SUCCESS");
    callback(null, response(200, res.Items));
  })
  .catch(err => callback(null, response(err.statusCode, err)));
}

//Get number of posts
module.exports.getPosts = (event, context, callback) => {

  const numberOfPosts = event.pathParameters.nummber;
  const params = {
    TableName: postTable,
    Limit: numberOfPosts
  };

  return db.scan(params)
  .promise()
  .then(res => {
    console.log("SUCCESS");
    callback(null, response(200, res));
  })
  .catch(err => callback(null, response(err.statusCode, err)));
}

//Get a single post
module.exports.getPost = (event, context, callback) => {

  const id = event.pathParameters.id;
  const params = {
    Key: {
      id: id
    },
    TableName: postTable
  }
  
  return db.getItem(params)
    .promise()
    .then(res => {
      console.log("SUCCESS");
      if(Object.keys(res.Items).length > 0) {
        callback(null, response(200, res.Items));
      } else {
        callback(null, response(404, {error: 'Post not found.'}));
      }
    })
    .catch(err => {
      console.log("in err");
      callback(null, response(err.statusCode, err));
    });
}

// Get a single post by Global Secondary Index (GSI) [userId] 
// See AWS-SDK Node.js documentation: 
// https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.04.html
module.exports.getPostByUserId = (event, context, callback) => {
  
  const userId = event.pathParameters.id;

  const params = {
    IndexName: "userId-index",
    KeyConditionExpression: "#uId = :pUserId",
    ExpressionAttributeNames: { "#uId":"userId" },
    ExpressionAttributeValues: {
        ":pUserId": userId
    },
    TableName: postTable
  };

  return db.query(params)
    .promise()
    .then(res => {
      console.log("SUCCESS");
      if(Object.keys(res.Items).length > 0) {
        callback(null, response(200, res.Items));
      } else {
        callback(null, response(404, {error: 'Post not found.'}));
      }
    })
    .catch(err => {
      callback(null, response(err.statusCode, err));
    });
}