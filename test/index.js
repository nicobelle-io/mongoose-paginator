'use strict';

/**
 * Libraries.
 */
var mongoose = require('mongoose');
var chai = require('chai');
var expect = chai.expect;
var mongoosePaginator = require('../index');

/**
 * Constants.
 */
var MONGO_URI = 'mongodb://127.0.0.1/mongoose-paginator-test';
var QTY_MOCK_MODELS = 10;

/**
 * Mock models.
 */
var User = mongoose.model('User', new mongoose.Schema({ 
  username: String, 
  password: String 
}));

var CustomerSchema = new mongoose.Schema({
  name: String,
  date: {
    type: Date,
    'default': Date.now() 
  },
  deleted: {
    type: Boolean,
    'default': false 
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }
});

var defaultOptions = {
  select: '',
  populate: '',
  lean: true,
  page: 1,
  limit: 0,
  maxLimit: 25,
  criteriaWrapper: undefined,
  convertCriteria: function(criteria, schema, callback) {
    callback(false, criteria);
  },
  sorters: {},
  convertSorters: function(sorters, callback) {
    callback(false, sorters);
  }
};
CustomerSchema.plugin(mongoosePaginator, {});
var Customer = mongoose.model('Customer', CustomerSchema);

/**
 * Unit tests.
 */
describe('Paginator plugin for ORM Mongoose', function () {

  before(function (done) {
    mongoose.connect(MONGO_URI, done);
  });
  
  before(function(done) {
    mongoose.connection.db.dropDatabase(done);
  });
  
  before(function(done) {
    User.create({ username: 'test', password: '123456' }, function (err, user) {
      if(err) {
        return done();
      }
      
      var customers = [];
      for(var i = 0; i < QTY_MOCK_MODELS; i++) {
        customers.push(new Customer({
          name: 'Customer ' + i,
          deleted: i % 2 === 0,
          createdBy: user._id 
        }));
      }
      
      Customer.create(customers, function(err, docs) {
        if(err) {
          return done();
        }
        
        done();
      });
    });
  });
  
  describe('#paginate()', function() {
    
    describe('parameter [criteria]', function() {
      
      describe('when not present', function() {
        it('should not throw or return an error', function(done) {
          Customer.paginate({}, {}, function(err, result) {
            expect(err).to.not.be.ok;
            
            done();
          });
        });
        
        it('should return all the documents', function(done) {
          Customer.paginate({}, {}, function(err, result) {
            expect(result).to.exist;
            expect(result.data).to.have.length(QTY_MOCK_MODELS);
            expect(result.total).to.equal(QTY_MOCK_MODELS);
            expect(result.limit).to.equal(QTY_MOCK_MODELS);
            expect(result.page).to.equal(1);
            
            done();
          });
        });
      });
      
      describe('when present', function() {
        it('should return the documents matching', function(done) {
          Customer.paginate({ name: 'Customer 5' }, {}, function(err, result) {
            expect(result).to.exist;
            expect(result.data).to.have.length(1);
            expect(result.total).to.equal(1);
            expect(result.limit).to.equal(1);
            expect(result.page).to.equal(1);
            
            done();
          });
        });
      });
    });
    
    describe('parameter [options]', function() {
      
      describe('when not present', function() {
        it('should not throw or return an error', function(done) {
          Customer.paginate({ deleted: true }, {}, function(err, result) {
            expect(err).to.not.be.ok;
            
            done();
          });
        });
        
        it('should return the documents considering the default options', function(done) {
          Customer.paginate({ deleted: false }, function(err, result) {
            expect(result).to.exist;
            expect(result.data).to.have.length(5);
            expect(result.total).to.equal(5);
            expect(result.limit).to.equal(5);
            expect(result.page).to.equal(1);
            
            done();
          });
        });
      });
      
      describe('when present', function() {

        describe('[options.criteriaWrapper]', function() {
          it('should throw exception if is not a function', function(done) {
            Customer.paginate({ name: { $in: ['Customer 0', 'Customer 2', 'Customer 4', 'Customer 5', 'Customer 7' ] }, deleted: true }, { criteriaWrapper: 'not function' }, function(err, result) {
              expect(err).to.exist;
      
              done();
            });
          });
          
          it('should execute without problems if is a function', function(done) {
            var options = {
              criteriaWrapper: function(criteria, callback) {
                criteria.deleted = false;
                
                callback(false, criteria);
              }
            };
            Customer.paginate({ name: { $in: ['Customer 0', 'Customer 2', 'Customer 5', 'Customer 7', 'Customer 8' ] }}, options, function(err, result) {
              expect(result).to.exist;
              expect(result.data).to.have.length(2);
      
              done();
            });
          });
        });
        
        describe('[options.convertCriteria]', function() {
          it('should throw exception if is not a function', function(done) {
            Customer.paginate({ name: 'Customer 4' }, { convertCriteria: 'not function' }, function(err, result) {
              expect(err).to.exist;
      
              done();
            });
          });
          
          it('should convert without problems if is a function', function(done) {
            var options = {
              convertCriteria: function(criteria, schema, callback) {
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
                  }
                }
                  
                return callback(false, criteria);
              }
            };
            Customer.paginate('[{"property":"name", "operator":"like", "value":"3"}]', options, function(err, result) {
              expect(result).to.exist;
              expect(result.data).to.have.length(1);
      
              done();
            });
          });
        });
        
        describe('[options.sort]', function() {
          it('should return the documents without ordering if property not exists', function(done) {
            Customer.paginate({ $or: [ { name: 'Customer 0' }, { name: 'Customer 1' }, { name: 'Customer 2' } ] }, { sort: '-xxxx' }, function(err, result) {
              expect(result).to.exist;
              expect(result.data[0].name).to.not.contain('2');
      
              done();
            });
          });
          
          it('should return the documents sorted if property exists', function(done) {
            Customer.paginate({}, { sort: { name: -1 } }, function(err, result) {
              expect(result).to.exist;
              expect(result.data[0].name).to.contain('9');
      
              done();
            });
          });
          
          it('should return the documents sorted if is a function', function(done) {
            var options = {
              sort: function(callback) {
                  callback(false, { name: 'desc' });
              } 
            };
            Customer.paginate({ deleted: true }, options, function(err, result) {
              expect(result).to.exist;
              expect(result.data[0].name).to.contain('8');
      
              done();
            });
          });
        });
        
        describe('[options.convertSort]', function() {
          it('should throw exception if is not a function', function(done) {
            Customer.paginate({ name: { $not: { $in: ['Customer 9', 'Customer 8'] } } }, { convertSort: 'not function' }, function(err, result) {
              expect(err).to.exist;
      
              done();
            });
          });
          
          it('should convert without problems if is a function', function(done) {
            var options = {
              sort: '[{"property": "name", "direction": "DESC"}]',
              convertSort: function(sort, schema, callback) {
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
            };
            Customer.paginate({ name: { $not: { $in: ['Customer 9', 'Customer 8'] } } }, options, function(err, result) {
              expect(result).to.exist;
              expect(result.data[0].name).to.contain('7');
      
              done();
            });
          });
        });
        
        describe('[options.select]', function() {
          it('should only return the id property of the documents if not exists', function(done) {
            Customer.paginate({ name: 'Customer 9' }, { select: 'xxxx' }, function(err, result) {
              expect(result).to.exist;
              expect(result.data[0]).to.have.all.keys('_id');
      
              done();
            });
          });
          
          it('should return the selected properties if exists', function(done) {
            Customer.paginate({ name: 'Customer 8' }, { select: 'name' }, function(err, result) {
              expect(result).to.exist;
              expect(result.data[0]).to.have.all.keys('_id', 'name');
      
              done();
            });
          });
          
          it('should return the selected properties if is a function', function(done) {
            var options = {
              select: function(callback) {
                  callback(false, 'deleted');
              } 
            };
            Customer.paginate({ name: 'Customer 7' }, options, function(err, result) {
              expect(result).to.exist;
              expect(result.data[0]).to.have.all.keys('_id', 'deleted');
      
              done();
            });
          });
        });
        
        describe('[options.populate]', function() {
          it('should return none populated property if not exists', function(done) {
            Customer.paginate({ name: { $in: [ 'Customer 0', 'Customer 1' ] } }, { populate: 'notexist' }, function(err, result) {
              expect(result).to.exist;
              expect(result.data[0].createdBy).to.not.contain.any.keys('username');
      
              done();
            });
          });
          
          it('should return the populated property if exists', function(done) {
            Customer.paginate({ name: 'Customer 3' }, { populate: { path: 'createdBy', select: 'username' } }, function(err, result) {
              expect(result).to.exist;
              expect(result.data[0].createdBy).to.contain.any.keys('username');
      
              done();
            });
          });
          
          it('should return the populated property if is a function', function(done) {
            var options = {
              populate: function(callback) {
                  callback(false, { path: 'createdBy', select: 'username' });
              } 
            };
            Customer.paginate({ name: 'Customer 9' }, options, function(err, result) {
              expect(result).to.exist;
              expect(result.data[0].createdBy).to.contain.any.keys('username');
      
              done();
            });
          });
        });
        
        describe('[options.maxLimit]', function() {
          it('should return the documents with limited amount', function(done) {
            Customer.paginate({ name: new RegExp('Cust', 'i') }, { maxLimit: 8 }, function(err, result) {
              expect(result).to.exist;
              expect(result.data).to.have.length(8);
              expect(result.total).to.equal(10);
              expect(result.limit).to.equal(8);
              expect(result.page).to.equal(1);
              
              done();
            });
          });
        });
        
        describe('[options.limit]', function() {
          it('should return the documents with limited amount (maxLimit undefined)', function(done) {
            Customer.paginate({ deleted: false }, { limit: 3 }, function(err, result) {
              expect(result).to.exist;
              expect(result.data).to.have.length(3);
              expect(result.total).to.equal(5);
              expect(result.limit).to.equal(3);
              expect(result.page).to.equal(1);
              
              done();
            });
          });
          
          it('should return the documents with limited amount (limit <= maxLimit)', function(done) {
            Customer.paginate({ deleted: false }, { maxLimit: 4, limit: 2 }, function(err, result) {
              expect(result).to.exist;
              expect(result.data).to.have.length(2);
              expect(result.total).to.equal(5);
              expect(result.limit).to.equal(2);
              expect(result.page).to.equal(1);
              
              done();
            });
          });
          
          it('should return the documents with limited amount (limit > maxLimit)', function(done) {
            Customer.paginate({ deleted: true }, { maxLimit: 4, limit: 5 }, function(err, result) {
              expect(result).to.exist;
              expect(result.data).to.have.length(4);
              expect(result.total).to.equal(5);
              expect(result.limit).to.equal(4);
              expect(result.page).to.equal(1);
              
              done();
            });
          });
        });
        
        describe('[options.page]', function() {
          it('should return the documents of the first page', function(done) {
            Customer.paginate({ deleted: false }, { page: 1, limit: 2, sort: 'name' }, function(err, result) {
              expect(result).to.exist;
              expect(result.data).to.have.length(2);
              expect(result.data[0].name).to.contain('1');
              expect(result.data[1].name).to.contain('3');
              expect(result.total).to.equal(5);
              expect(result.limit).to.equal(2);
              expect(result.page).to.equal(1);
              
              done();
            });
          });
          
          it('should return the documents of the next page', function(done) {
            Customer.paginate({ deleted: false }, { page: 2, limit: 2, sort: 'name' }, function(err, result) {
              expect(result).to.exist;
              expect(result.data).to.have.length(2);
              expect(result.data[0].name).to.contain('5');
              expect(result.data[1].name).to.contain('7');
              expect(result.total).to.equal(5);
              expect(result.limit).to.equal(2);
              expect(result.page).to.equal(2);
              
              done();
            });
          });
          
          it('should return the documents of the last page', function(done) {
            Customer.paginate({ deleted: false }, { page: 3, limit: 2, sort: 'name' }, function(err, result) {
              expect(result).to.exist;
              expect(result.data).to.have.length(1);
              expect(result.data[0].name).to.contain('9');
              expect(result.total).to.equal(5);
              expect(result.limit).to.equal(2);
              expect(result.page).to.equal(3);
              
              done();
            });
          });
        });
        
        describe('[options.lean]', function() {
          it('should return the documents in plain object (lean<>false)', function(done) {
            Customer.paginate({ deleted: true }, { lean: true }, function(err, result) {
              expect(result).to.exist;
              expect(result.data[0]).to.not.be.instanceof(mongoose.Document);
              
              done();
            });
          });
          
          it('should return the documents in mongoose object (lean=false)', function(done) {
            Customer.paginate({ deleted: false }, { lean: false }, function(err, result) {
              expect(result).to.exist;
              expect(result.data[0]).to.be.instanceof(mongoose.Document);
              
              done();
            });
          });
        });
      });
    });
  });
  
  after(function(done) {
    mongoose.connection.db.dropDatabase(done);
  });
  
  after(function (done) {
    mongoose.disconnect(done);
  });
  
});