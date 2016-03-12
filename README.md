# mongoose-paginator

[![Build Status](https://travis-ci.org/raphaelfjesus/mongoose-paginator.svg?branch=master)](http://travis-ci.org/raphaelfjesus/mongoose-paginator)
[![Code Climate](https://codeclimate.com/github/raphaelfjesus/mongoose-paginator/badges/gpa.svg)](https://codeclimate.com/github/raphaelfjesus/mongoose-paginator)
[![Test Coverage](https://codeclimate.com/github/raphaelfjesus/mongoose-paginator/badges/coverage.svg)](https://codeclimate.com/github/raphaelfjesus/mongoose-paginator/coverage)

An pagination plugin for ORM [mongoose.js](http://mongoosejs.com/).

## Requirements

 - [NodeJS](https://nodejs.org/en/) >= 4.1

## Installation

```bash
$ npm install mongoose-paginator-simple
```

## Usage

```javascript
// model.js
var mongoose = require('mongoose');
var mongoosePaginator = require('mongoose-paginator-simple');

var schema = new mongoose.Schema({ /* definition */ });
schema.plugin(mongoosePaginator, { /* options for apply in all queries paging */ });

module.exports = mongoose.model('YourModel', schema);

// controller.js
var YourModel = mongoose.model('YourModel');

/*
 * Using callback
 */
YourModel.paginate([criteria], [options], function(err, result) {
  console.log(result);
});

// or 

YourModel.paginate([criteria], function(err, result) {
  console.log(result);
});

/*
 * Using native promise (ECMAScript 6)
 */
YourModel.paginate([criteria], [options]).then(function(result) {
  console.log(result);
}, function(err) {
  // ...
});

// or

YourModel.paginate([criteria]).then(function(result) {
  console.log(result);
}, function(err) {
  // ...
});
```

Output will be:
```javascript
/*
{
  total: <Number>, 
  limit: <Number>,
  page: <Number>,
  data: <Document...N>
}
*/
```

## Configuration

Below is a complete listing of all default configuration options.

**Existing in mongoose**

- The [criteria](http://mongoosejs.com/docs/api.html#query_Query-find) can be used to filter the documents.
- The [sort](http://mongoosejs.com/docs/api.html#query_Query-sort) option can be used to specify the sort order.
- The [select](http://mongoosejs.com/docs/api.html#query_Query-select) option can be used to specify which document fields to include or exclude (also known as the query "projection").
- The [populate](http://mongoosejs.com/docs/api.html#query_Query-populate) option can be used to specify paths which should be populated with other documents.
- The [limit](http://mongoosejs.com/docs/api.html#query_Query-limit) option can be used to specify the maximum number of documents the query will return.
- The page option can be used to specify number of the page that will be used to calculate the number of documents to [skip](http://mongoosejs.com/docs/api.html#query_Query-skip).
- The [lean](http://mongoosejs.com/docs/api.html#query_Query-lean) option can be used to specify the lean option. **Default value:** *true*

> **NOTE:** According Mongoose Docs, the lean option has a high-performance read-only scenarios when true.

**Additional options**

- The `maxLimit` option can be used to specify the maximum number of documents the query will return, when the `limit` option is setted from request, preventing overloading the application server with excessive use of memory.
- The `convertCriteria` option can be used to specify a criteria converter.
- The `criteriaWrapper` option can be used to specify a criteria wrapper, adding criteria common to all queries paging.
- The `convertSort` option can be used to specify a sort converter.

## Examples

To facilitate understanding of the following examples, we will define the models to be used in the exemplification of the use plugin below:

```javascript
// model/user.js
var mongoose = require('mongoose');

var schema = new mongoose.Schema({
  username: String,
  password: String 
});

module.export = mongoose.model('User', schema);
```

```javascript
// model/customer.js
var mongoose = require('mongoose');
var mongoosePaginator = require('mongoose-paginator-simple');

var schema = new mongoose.Schema({
  name: String,
  deleted: {
    type: Boolean,
    'default': false 
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId 
    ref: 'User'
  }
});

schema.plugin(mongoosePaginator, {
  maxLimit: 25,
  criteriaWrapper: function(criteria) {
    criteria.deleted = false; // Exclusion logic documents
    return criteria;
  },
  convertCriteria: function(criteria, schema) {
    if(criteria && criteria.name) {
      criteria.name = new RegExp(criteria.name, 'i'); // Apply like
    }

    return criteria;
  },
  convertSort: function(sort, schema) {
    if(sort) {
      for(var key in sort) {
        if('DESC' === sort[key]) {
          sort[key] = -1;
        } else if('ASC' === sort[key]) {
          sort[key] = 1;
        }
      }
    }
    
    return sort;
  }
}); 

module.export = mongoose.model('Customer', schema);
```

>**Note:** To illustrate the examples, consider that there are 10 documents to the _Customer model_ and 1 document to the _User model_, represented below:
```javascript
// User model
var allUsers = [
  { _id: '<ObjectId>', username: 'test', password: '123456' }
];
// Customer model
var allCostumers = [
  { _id: '<ObjectId>', name: 'Customer 0', deleted: true, createdBy: '<ObjectId>' },
  { _id: '<ObjectId>', name: 'Customer 1', deleted: false, createdBy: '<ObjectId>' },
  { _id: '<ObjectId>', name: 'Customer 2', deleted: true, createdBy: '<ObjectId>' },
  { _id: '<ObjectId>', name: 'Customer 3', deleted: false, createdBy: '<ObjectId>' },
  { _id: '<ObjectId>', name: 'Customer 4', deleted: true, createdBy: '<ObjectId>' },
  { _id: '<ObjectId>', name: 'Customer 5', deleted: false, createdBy: '<ObjectId>' },
  { _id: '<ObjectId>', name: 'Customer 6', deleted: true, createdBy: '<ObjectId>' },
  { _id: '<ObjectId>', name: 'Customer 7', deleted: false, createdBy: '<ObjectId>' },
  { _id: '<ObjectId>', name: 'Customer 8', deleted: true, createdBy: '<ObjectId>' },
  { _id: '<ObjectId>', name: 'Customer 9', deleted: false, createdBy: '<ObjectId>' }
];
```

- **No parameters**: Using the default options for the plugin registration in the model (simple use).

```javascript
// controller/customer.js
var mongoose = require('mongoose');
var Customer = mongoose.model('Customer');

Customer.paginate({}, function(err, result) {
  console.log(result);
});

// or

Customer.paginate({}).then(function(result) {
  console.log(result);
});
```

Output will be:
```javascript
{
  total: 5, 
  limit: 25,
  page: 1,
  data: [
    { _id: '<ObjectId>', name: 'Customer 1', deleted: false, createdBy: '<ObjectId>' },
    { _id: '<ObjectId>', name: 'Customer 3', deleted: false, createdBy: '<ObjectId>' },
    { _id: '<ObjectId>', name: 'Customer 5', deleted: false, createdBy: '<ObjectId>' },
    { _id: '<ObjectId>', name: 'Customer 7', deleted: false, createdBy: '<ObjectId>' },
    { _id: '<ObjectId>', name: 'Customer 9', deleted: false, createdBy: '<ObjectId>' }
  ]
}
```

- **With criteria**: Stating only the document selection criteria for return (common use).

```javascript
// controller/customer.js
var mongoose = require('mongoose');
var Customer = mongoose.model('Customer');

Customer.paginate({ name: 'Customer 5' }, function(err, result) {
  console.log(result);
});

// or

Customer.paginate({ name: 'Customer 5' }).then(function(result) {
  console.log(result);
});
```

Output will be:
```javascript
{
  total: 1, 
  limit: 25,
  page: 1,
  data: [
    { _id: '<ObjectId>', name: 'Customer 5', deleted: false, createdBy: '<ObjectId>' } 
  ]
}
```

- **With criteria and customized options**: Using customized options and document selection criteria for return (advanced use).

```javascript
// controller/customer.js
var mongoose = require('mongoose');
var Customer = mongoose.model('Customer');

// It will be converted to a regex, as defined in the converter model 
var criteria = { 
  name: 'Cust' 
};

var options = {
  select: 'name createdBy',
  populate: { path: 'createdBy', select: 'username' },
  
  // Will be converted to the expected syntax for the mongoose, as defined in the converter model
  sort: { 
    name: 'DESC' 
  }
};

Customer.paginate(criteria, options, function(err, result) {
  console.log(result);
});

// or

Customer.paginate(criteria, options).then(function(result) {
  console.log(result);
});
```

Output will be:
```javascript
{
  total: 5,
  limit: 25,
  page: 1,
  data: [
    {  _id: '<ObjectId>', name: 'Customer 9', createdBy: { username: 'test' } },
    {  _id: '<ObjectId>', name: 'Customer 7', createdBy: { username: 'test' } },
    {  _id: '<ObjectId>', name: 'Customer 5', createdBy: { username: 'test' } },
    {  _id: '<ObjectId>', name: 'Customer 3', createdBy: { username: 'test' } },
    {  _id: '<ObjectId>', name: 'Customer 1', createdBy: { username: 'test' } }
  ]
}
```

## Contributing

1. Fork it ( https://github.com/raphaelfjesus/mongoose-paginator/fork )
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create a new Pull Request

## Tests

To run the test suite, first install the dependencies, then run npm test:

```bash
$ npm install
$ npm test
```

## License

The MIT License (MIT)

Copyright (c) 2016 Raphael F. Jesus <raphaelfjesus@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
