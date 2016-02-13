# mongoose-paginator

[![Build Status](https://travis-ci.org/raphaelfjesus/mongoose-paginator.svg?branch=master)](http://travis-ci.org/raphaelfjesus/mongoose-paginator)
[![Code Climate](https://codeclimate.com/github/raphaelfjesus/mongoose-paginator/badges/gpa.svg)](https://codeclimate.com/github/raphaelfjesus/mongoose-paginator)
[![Test Coverage](https://codeclimate.com/github/raphaelfjesus/mongoose-paginator/badges/coverage.svg)](https://codeclimate.com/github/raphaelfjesus/mongoose-paginator/coverage)

An pagination plugin for ORM [mongoose.js](http://mongoosejs.com/).

## Installation

```bash
$ npm install mongoose-paginator
```

## Usage

```javascript
// model.js
var mongoose = require('mongoose');
var mongoosePaginator = require('mongoose-paginator');

var schema = new mongoose.Schema({ /* definition */ });
schema.plugin(mongoosePaginator, { /* options for apply in all queries paging */ });

module.exports = mongoose.model('Model', schema);

// controller.js
var Model = mongoose.model('ModelName');

Model.paginate({ /* criteria */ }, { /* options for its use */ }, function(err, result) {
	console.log(result);
	/*{ 
    total: <Number>, 
    limit: <Number>, 
    page: <Number>,
    data: [<Document>] 
  }*/
});
```

### Paginate Criteria
####`criteria` _<[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)> mongodb selector_

The [criteria](http://mongoosejs.com/docs/api.html#query_Query-find) can be used to filter the documents. **Default value:** *{}*

```javascript
Model.paginate({ pathName: 'value' }, [option], [callback]);
```

### Paginate Options
####`criteriaWrapper`_<[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)>_

The `criteriaWrapper` option can be used to specify a criteria wrapper, adding criteria common to all queries paging. **Default value:** *undefined*

```javascript
// Set as default option for model
schema.plugin(mongoosePaginator, {
  criteria: { pathName: 'value' }, 
  criteriaWrapper: function(criteria, callback) {
    // criteria output here: { pathName: 'value' }
    
    criteria.pathName2 = 'otherValue';
    // criteria output here: { pathName: 'value', pathName2: 'otherValue' }
    
    return callback(false, criteria);
  }
});
```

####`convertCriteria`_<[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)>_

The `convertCriteria` option can be used to specify a criteria converter.

```javascript
// Set as default option for model
schema.plugin(mongoosePaginator, {
  
  // From request. Syntax of the Sencha ExtJS framework (front-end)
  criteria: '[{"property":"pathName", "operator":"like", "value":"v"}]', 
  
  convertCriteria: function(criteria, schema, callback) {
    // criteria output here: [{"property":"pathName", "operator":"like", "value":"v"}]
    
    if(criteria && typeof criteria === 'string') {
      var filters = JSON.parse(criteria);
      
      if(Array.isArray(filters)) {
        var filter;
        criteria = {};
        
        for(var i = 0, len = filters.length; i < len; i++) {
          filter = filters[i];
          
          // ignore not paths mongoose
          if(!schema.path(filter.property)) {
            continue;
          }
          
          if('like' === filter.operator) {
            criteria[filter.property] = new RegExp(filter.value, 'i');
          
          } else {
            criteria[filter.property] = filter.value;
          }
        }
      
	      // criteria output here: { pathName: new RegExp('v', 'i') }
      }
    }
      
    return callback(false, criteria);
  }
});
```

####`sort` _<[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String) | [Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) | [function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)>_

The [sort](http://mongoosejs.com/docs/api.html#query_Query-sort) option can be used to specify the sort order. **Default value:** *undefined*

```javascript
// Set as default option for model
schema.plugin(mongoosePaginator, {
  sort: { pathName: 1 } // 1 = ASC e -1 = DESC
});

// or

// Overrides the select option set as default only for this execution
Model.paginate([criteria], { sort: 'pathName1 -pathName2' }, [callback]);
```

####`convertSort` _<[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)>_

The `convertSort` option can be used to specify a sort converter.

```javascript
// Set as default option for model
schema.plugin(mongoosePaginator, {
  
  // From request. Syntax of the Sencha ExtJS framework (front-end)
  sort: '[{"property": "pathName", "direction": "DESC"}]',
  
  convertSort: function(sort, callback) {
    if(sort && typeof sort === 'string') {
      var jsonSort = JSON.parse(sort);
      
      if(Array.isArray(jsonSort)) {
        sort = {};
        
		    var s;
        for(var i = 0, len = jsonSort.length; i < len; i++) {
          s = jsonSort[i];
          
          if(s.direction === 'DESC') {
            sort[s.property] = -1; // desc or descending
          } else if(s.direction === 'ASC') {
            sort[s.property] = 1; // asc, or ascending
          } else {
            sort[s.property] = s.direction;
          }
        }
      
        return callback(false, sort);
      }
    }
    
    return callback(false, sort);
  }
});
```

####`select` _<[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String) | [Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)>_

The [select](http://mongoosejs.com/docs/api.html#query_Query-select) option can be used to specify which document fields to include or exclude (also known as the query "projection"). **Default value:** *''*

```javascript
// Set as default option for model
schema.plugin(mongoosePaginator, {
  select: 'pathName1 pathName2' 
});

// or

// Overrides the select option set as default only for this execution
Model.paginate([criteria], { select: 'pathName3' }, [callback]);
```

####`populate` _<[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String) | [Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)>_

The [populate](http://mongoosejs.com/docs/api.html#query_Query-populate) option can be used to specify paths which should be populated with other documents. **Default value:** *undefined*

```javascript
// Set as default option for model
schema.plugin(mongoosePaginator, {
  populate: { path: 'modelRef', select: 'pathName' } 
});

// or

// Overrides the select option set as default only for this execution
Model.paginate([criteria], { populate: 'pathName2' }, [callback]);
```

####`limit` _<[Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)>_

The [limit](http://mongoosejs.com/docs/api.html#query_Query-limit) option can be used to specify the maximum number of documents the query will return. **Default value:** *-1*
> **NOTE:** Let -1 to not limit the number of documents to be returned. *(not recommended)*

```javascript
// Set as default option for model
schema.plugin(mongoosePaginator, {
  limit: 20 
});

// or

// Overrides the select option set as default only for this execution
Model.paginate([criteria], { limit: 10 }, [callback]);
```

####`maxLimit` _<[Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)>_

The `maxLimit` option can be used to specify the maximum number of documents the query will return, when the `limit` option is setted from request, preventing overloading the application server with excessive use of memory. **Default value:** *25*

```javascript
// Set as default option for model
schema.plugin(mongoosePaginator, {
  maxLimit: 100  
});

// or

// Overrides the select option set as default only for this execution
Model.paginate([criteria], { maxLimit: 50 }, [callback]);
```

####`page` _<[Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)>_

The page option can be used to specify number of the page that will be used to calculate the number of documents to [skip](http://mongoosejs.com/docs/api.html#query_Query-skip). **Default value:** *1*

```javascript
// Set as default option for model
schema.plugin(mongoosePaginator, {
  page: 1 
});

// or

// Overrides the select option set as default only for this execution
Model.paginate([criteria], { page: 2 }, [callback]);
```

####`lean` _<[Boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean)>_

The [lean](http://mongoosejs.com/docs/api.html#query_Query-lean) option can be used to specify the lean option. **Default value:** *true*

```javascript
// Set as default option for model
schema.plugin(mongoosePaginator, {
  lean: true 
});

// or

// Overrides the select option set as default only for this execution
Model.paginate([criteria], { lean: false }, [callback]);
```

> **NOTE:** According Mongoose Docs, this is a great option in high-performance read-only scenarios.

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
var mongoosePaginator = require('mongoose-paginator');

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

// Registering the plugin
schema.plugin(mongoosePaginator, {
  maxLimit: 25,
  criteriaWrapper: function(criteria, callback) {
    criteria.deleted = false; // Exclusion logic documents
	return callback(false, criteria);
  },
  convertCriteria: function(criteria, schema, callback) {
    if(criteria && criteria.name) {
	  criteria.name = new RegExp(criteria.name, 'i'); // Apply like
	}
	  
    return callback(false, criteria);
  },
  convertSort: function(sort, callback) {
    if(sort) {
	  for(var key in sort) {
	    if('DESC' === sort[key]) {
		  sort[key] = -1;
		
		} else if('ASC' === sort[key]) {
		  sort[key] = 1;
		}
	  }
	}
	
	return callback(false, sort);
  }
}); 

module.export = mongoose.model('Customer', schema);
```

>**Note:** To illustrate the examples, consider that there are 10 documents to the *Customer model* and 1 document to the *User model*, represented below:
```javascript
// User model
var allUsers = [
  { _id: <ObjectId>, username: 'test', password: '123456' }
];

// Customer model
var allCostumers = [
  { _id: <ObjectId>, name: 'Customer 0', deleted: true, createdBy: <ObjectId> },
  { _id: <ObjectId>, name: 'Customer 1', deleted: false, createdBy: <ObjectId> },
  { _id: <ObjectId>, name: 'Customer 2', deleted: true, createdBy: <ObjectId> },
  { _id: <ObjectId>, name: 'Customer 3', deleted: false, createdBy: <ObjectId> },
  { _id: <ObjectId>, name: 'Customer 4', deleted: true, createdBy: <ObjectId> },
  { _id: <ObjectId>, name: 'Customer 5', deleted: false, createdBy: <ObjectId> },
  { _id: <ObjectId>, name: 'Customer 6', deleted: true, createdBy: <ObjectId> },
  { _id: <ObjectId>, name: 'Customer 7', deleted: false, createdBy: <ObjectId> },
  { _id: <ObjectId>, name: 'Customer 8', deleted: true, createdBy: <ObjectId> },
  { _id: <ObjectId>, name: 'Customer 9', deleted: false, createdBy: <ObjectId> }
];
```

- **No parameters**: Using the default options for the plugin registration in the model (simple use).

```javascript
// controller/customer.js
var mongoose = require('mongoose');
var Customer = mongoose.model('Customer');

var criteria = {};
var options = {};

Customer.paginate(criteria, options, function(err, result) {
  console.log(result);
});

// or

Customer.paginate(criteria, function(err, result) {
  console.log(result);
});
```

Output will be:
```javascript
{
  total: 5, 
  page: 1,
  limit: 25,
  data: [
  { _id: <ObjectId>, name: 'Customer 1', deleted: false, createdBy: <ObjectId> },
	{ _id: <ObjectId>, name: 'Customer 3', deleted: false, createdBy: <ObjectId> },
	{ _id: <ObjectId>, name: 'Customer 5', deleted: false, createdBy: <ObjectId> },
	{ _id: <ObjectId>, name: 'Customer 7', deleted: false, createdBy: <ObjectId> },
	{ _id: <ObjectId>, name: 'Customer 9', deleted: false, createdBy: <ObjectId> }
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
```

Output will be:
```javascript
{
  total: 1, 
  page: 1,
  limit: 25,
  data: [
    { _id: <ObjectId>, name: 'Customer 5', deleted: false, createdBy: <ObjectId> } 
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
```

Output will be:
```javascript
{
  total: 5,
  page: 1,
  limit: 25,
  data: [
  {  _id: <ObjectId>, name: 'Customer 9', createdBy: { username: 'test' } },
	{  _id: <ObjectId>, name: 'Customer 7', createdBy: { username: 'test' } },
	{  _id: <ObjectId>, name: 'Customer 5', createdBy: { username: 'test' } },
	{  _id: <ObjectId>, name: 'Customer 3', createdBy: { username: 'test' } },
	{  _id: <ObjectId>, name: 'Customer 1', createdBy: { username: 'test' } }
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

[MIT](LICENSE)