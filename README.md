# mongoose-paginator

[![Build Status](https://secure.travis-ci.org/raphaelfjesus/mongoose-paginator.png)](http://travis-ci.org/raphaelfjesus/mongoose-paginator)

An pagination plugin for ORM [mongoose.js]( http://mongoosejs.com/ ).

## Installation

```sh
npm install mongoose-paginator
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
var mongoose = require('mongoose');
var Model = mongoose.model('ModelName');

Model.paginate({ /* criteria */ }, { /* options for its use */ }, function(err, result) {
	// implementation
});
```

### Paginate Criteria
####`criteria`
_<Object> mongodb selector_

The [criteria]( http://mongoosejs.com/docs/api.html#query_Query-find ) can be used to filter the documents.

```javascript
Model.paginate({ pathName: 'value' }, [option], [callback]);
```

### Paginate Options
####`criteriaWrapper`
_<Function>_

The `criteriaWrapper` option can be used to specify a criteria wrapper, adding criteria common to all queries paging.

```javascript
// Set as default option for model
schema.plugin(mongoosePaginator, {
  criteria: { pathName: 'value' }, 
  criteriaWrapper: function(criteria, callback) {
    // criteria output here: { pathName: 'value' }
    
    criteria.deleted = false; // Avoid return the documents logically excluded
    // criteria output here: { pathName: 'value', deleted: false }
    
    return callback(false, criteria);
  }
});
```

####`convertCriteria`
_<Function>_

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
        var result = {};
        
        for(var i = 0, len = filters.length; i < len; i++) {
          filter = filters[i];
          
          // ignore not paths mongoose
          if(!schema.path(filter.property)) {
            continue;
          }
          
          if('like' === filter.operator) {
            result[filter.property] = new RegExp(filter.value, 'i');
          
          } else {
            result[filter.property] = filter.value;
          }
        }
      
        return callback(false, result);
      }
    }
      
    return callback(false, criteria);
  }
});
```

####`sorters`
_<Object, String, Function>_

The [sorters]( http://mongoosejs.com/docs/api.html#query_Query-sort ) option can be used to specify the sort order.

```javascript
// Set as default option for model
schema.plugin(mongoosePaginator, {
  sorters: { pathName: 1 } // 1 = ASC e -1 = DESC
});

// or

// Overrides the select option set as default only for this execution
Model.paginate([criteria], 'pathName1 -pathName2', [callback]);
```

####`convertSorters`
_<Function>_

The `convertSorters` option can be used to specify a sorters converter.

```javascript
// Set as default option for model
schema.plugin(mongoosePaginator, {
  
  // From request. Syntax of the Sencha ExtJS framework (front-end)
  sorters: '[{"property": "pathName", "direction": "DESC"}]',
  
  convertSorters: function(sorters, callback) {
    if(sorters && typeof sorters === 'string') {
      var jsonSorters = JSON.parse(sorters);
      
      if(Array.isArray(jsonSorters)) {
        var result = {};
        var sort;
      
        for(var i = 0, len = jsonSorters.length; i < len; i++) {
          sort = jsonSorters[i];
          
          if(sort.direction === 'DESC') {
            result[sort.property] = -1;
          } else if(sort.direction === 'ASC') {
            result[sort.property] = 1;
          } else {
            result[sort.property] = sort.direction;
          }
        }
      
        return callback(false, result);
      }
    }
    
    return callback(false, sorters);
  }
});
```

####`select`
_<Object, String>_

The [select]( http://mongoosejs.com/docs/api.html#query_Query-select ) option can be used to specify which document fields to include or exclude (also known as the query "projection").

```javascript
// Set as default option for model
schema.plugin(mongoosePaginator, {
  select: 'pathName1 pathName2' 
});

// or

// Overrides the select option set as default only for this execution
Model.paginate([criteria], { select: 'pathName3' }, [callback]);
```

####`populate`
_<Object, String>_

The [populate]( http://mongoosejs.com/docs/api.html#query_Query-populate ) option can be used to specify paths which should be populated with other documents.

```javascript
// Set as default option for model
schema.plugin(mongoosePaginator, {
  populate: { path: 'modelRef', select: 'pathName' } 
});

// or

// Overrides the select option set as default only for this execution
Model.paginate([criteria], { populate: 'pathName2' }, [callback]);
```

####`lean`
_<Boolean>_

The [lean]( http://mongoosejs.com/docs/api.html#query_Query-lean ) option can be used to specify the lean option.
_NOTE:_ According Mongoose Docs, this is a great option in high-performance read-only scenarios.

```javascript
// Set as default option for model
schema.plugin(mongoosePaginator, {
  lean: true 
});

// or

// Overrides the select option set as default only for this execution
Model.paginate([criteria], { lean: false }, [callback]);
```

####`limit`
_<[Number]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number )>_

The [limit]( http://mongoosejs.com/docs/api.html#query_Query-limit ) option can be used to specify the maximum number of documents the query will return.

```javascript
// Set as default option for model
schema.plugin(mongoosePaginator, {
  limit: 20 
});

// or

// Overrides the select option set as default only for this execution
Model.paginate([criteria], { limit: 10 }, [callback]);
```

####`maxLimit`
_<[Number]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number )>_

The `maxLimit` option can be used to specify the maximum number of documents the query will return, when the `limit` option is setted from request, preventing overloading the application server with excessive use of memory.

```javascript
// Set as default option for model
schema.plugin(mongoosePaginator, {
  maxLimit: 100  
});

// or

// Overrides the select option set as default only for this execution
Model.paginate([criteria], { maxLimit: 50 }, [callback]);
```

####`page`
_<Number>_

The [page]( http://mongoosejs.com/docs/api.html#query_Query-skip ) option can be used to specify number of the page that will be used to calculate the number of documents to skip.

```javascript
// Set as default option for model
schema.plugin(mongoosePaginator, {
  page: 1 
});

// or

// Overrides the select option set as default only for this execution
Model.paginate([criteria], { page: 2 }, [callback]);
```

## Examples

Using only the default options:

```javascript
// controller.js
var Model = require('mongoose').model('Model');

var criteria = {};
var options = {
  /*
  select: '',
  populate: '',
  lean: true,
  page: 1,
  limit: -1,
  maxLimit: undefined,
  criteriaWrapper: undefined,
  convertCriteria: undefined,
  sorters: {},
  convertSorters: undefined,
  */
};

Model.paginate(criteria, options, function(err, result) {
  console.log(result); 
  /*
  { 
    total: <Number>, 
    limit: <Number>, 
    page: <Number>,
    data: <Document> 
  }
  */
});
```

## Tests

To run the test suite, first install the dependencies, then run npm test:

```sh
$ npm install
$ npm test
```

## License

[MIT](LICENSE)