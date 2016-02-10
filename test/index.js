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
CustomerSchema.plugin(mongoosePaginator, defaultOptions);
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
  
  describe('paginate', function() {
    it('should return the documents when criteria and custom options not are present', function(done) {
      Customer.paginate({}, {}, function(err, result) {
        expect(err).to.equal(false);
        expect(result.total).to.equal(10);
        expect(result.limit).to.equal(0);
        expect(result.page).to.equal(1);
        expect(result.data).to.have.length(10);
      
        done();
      });
    });
    
    it('should return the documents when criteria are present', function(done) {
      Customer.paginate({ name: 'Customer 5' }, {}, function(err, result) {
        expect(err).to.equal(false);
        expect(result.total).to.equal(1);
        expect(result.limit).to.equal(0);
        expect(result.page).to.equal(1);
        expect(result.data).to.have.length(1);
        expect(result.data[0].name).to.equal('Customer 5');
      
        done();
      });
    });
  
    it('should return the documents when criteria and all custom options are present', function(done) {
      var criteria = { deleted: true };
      var options = { 
        maxLimit: 4, 
        limit: 10, 
        page: 1, 
        lean: true, 
        select: 'name createdBy', 
        populate: { 
          path: 'createdBy', 
          select: 'username' 
        }, 
        convertCriteria: function(criteria, schema, callback) {
          callback(false, criteria);
        },
        criteriaWrapper: function(criteria, callback) {
          callback(false, criteria);
        },
        sorters: { 
          name: 'DESC' 
        },
        convertSorters: function(sorters, callback) {
          if(sorters.name) {
            return callback(false, { name: sorters.name === 'DESC' ? -1 : 1 });
          }
          
          return callback(false, sorters);
        }
      };
      
      Customer.paginate(criteria, options, function(err, result) {
        expect(err).to.equal(false);
        expect(result.total).to.equal(5);
        expect(result.limit).to.equal(4);
        expect(result.page).to.equal(1);
        expect(result.data).to.have.length(4);
        expect(result.data[0]).to.have.all.keys('name', 'createdBy', '_id');
        expect(result.data[0].createdBy.username).to.equal('test');
      
        done();
      });
    });
  });
  
  describe('options', function() {
    it('should apply only out of schema when present in paginate method', function(done) {
      var options = {
        select: 'name createdBy',
        populate: { path: 'createdBy', select: 'username' },
        lean: true,
        page: 1,
        limit: 5,
        maxLimit: 10,
        criteriaWrapper: undefined,
        convertCriteria: undefined,
        sorters: {},
        convertSorters: undefined 
      };
      
      Customer.paginate({}, options, function(err, result) {
        expect(err).to.equal(false);
        expect(result.page).to.equal(1);
        expect(result.limit).to.equal(5);
        expect(result.total).to.equal(10);
        expect(result.data).to.have.length(5);
        expect(result.data[0]).to.have.all.keys('name', 'createdBy', '_id');
        expect(result.data[0].createdBy.username).to.equal('test');
        
        expect(defaultOptions.select).to.be.empty;
        expect(defaultOptions.populate).to.be.empty;
        expect(defaultOptions.lean).to.be.true;
        expect(defaultOptions.page).to.equal(1);
        expect(defaultOptions.limit).to.equal(0);
        expect(defaultOptions.maxLimit).to.equal(25);
        expect(defaultOptions.criteriaWrapper).to.be.undefined;
        expect(defaultOptions.convertCriteria).to.be.a('function');
        expect(defaultOptions.sorters).to.be.empty;
        expect(defaultOptions.convertSorters).to.be.a('function');

        done();
      });
    });
      
    describe('option select', function() {
      it('should return all properties when not present', function(done) {
        var options = {
          select: undefined 
        };
        Customer.paginate({}, options, function(err, result) {
          expect(err).to.equal(false);
          expect(result.data[0]).to.have.all.keys('name', 'date', 'deleted', 'createdBy', '__v', '_id');
  
          done();
        });
      });
    
      it('should return none when property not exist', function(done) {
        var options = {
          select: 'xxxx' 
        };
        Customer.paginate({}, options, function(err, result) {
          expect(err).to.equal(false);
          expect(result.data[0]).to.have.all.keys('_id');
  
          done();
        });
      });
    
      it('should return selected properties when present', function(done) {
        var options = {
          select: 'name' 
        };
        Customer.paginate({}, options, function(err, result) {
          expect(err).to.equal(false);
          expect(result.data[0]).to.have.all.keys('name', '_id');
  
          done();
        });
      });
    
      it('should return selected properties when is function', function(done) {
        var options = {
          select: function(callback) {
              callback(false, 'date');
          } 
        };
        Customer.paginate({}, options, function(err, result) {
          expect(err).to.equal(false);
          expect(result.data[0]).to.have.all.keys('date', '_id');
  
          done();
        });
      });
    });
  
    describe('option populate', function() {
      it('should return only properties without reference when not present', function(done) {
        var options = {
          populate: undefined 
        };
        Customer.paginate({}, options, function(err, result) {
          expect(err).to.equal(false);
          expect(result.data[0].createdBy).to.not.contain.any.keys('username');
  
          done();
        });
      });
    
      it('should return none property with reference when property not exist', function(done) {
        var options = {
          populate: 'xxxx' 
        };
        Customer.paginate({}, options, function(err, result) {
          expect(err).to.equal(false);
          expect(result.data[0].createdBy).to.not.contain.any.keys('username');
  
          done();
        });
      });
    
      it('should return properties with reference when present', function(done) {
        var options = {
          populate: { path: 'createdBy', select: 'username' } 
        };
        Customer.paginate({}, options, function(err, result) {
          expect(err).to.equal(false);
          expect(result.data[0].createdBy).to.contain.any.keys('username');
  
          done();
        });
      });
    
      it('should return properties with reference when is function', function(done) {
        var options = {
          populate: function(callback) {
            callback(false, { path: 'createdBy', select: 'username' });
          } 
        };
        Customer.paginate({}, options, function(err, result) {
          expect(err).to.equal(false);
          expect(result.data[0].createdBy).to.contain.any.keys('username');
  
          done();
        });
      });
    });
    
    describe('option limit', function() {
      it('should return all documents when not present', function(done) {
        var options = {
          limit: undefined  
        };
        Customer.paginate({}, options, function(err, result) {
          expect(err).to.equal(false);
          expect(result.data).to.have.length(QTY_MOCK_MODELS);
  
          done();
        });
      });
    
      it('should return all documents when less than or equal to zero', function(done) {
        var options = {
          limit: 0  
        };
        Customer.paginate({}, options, function(err, result) {
          expect(err).to.equal(false);
          expect(result.data).to.have.length(QTY_MOCK_MODELS);
  
          done();
        });
      });
    
      it('should return the documents (quantity less or equal) when greater than zero', function(done) {
        var options = {
          limit: 5  
        };
        Customer.paginate({}, options, function(err, result) {
          expect(err).to.equal(false);
          expect(result.data).to.have.length(5);
  
          done();
        });
      });
    });
  
    describe('option sorters', function() {
      it('should return documents without sort when not present', function(done) {
        var options = {
          sorters: undefined 
        };
        Customer.paginate({}, options, function(err, result) {
          expect(err).to.equal(false);
          expect(result.data).to.have.length(QTY_MOCK_MODELS);
  
          done();
        });
      });
    
      it('should return documents without sort when property not exist', function(done) {
        var options = {
          sorters: { x: 1 } 
        };
        Customer.paginate({}, options, function(err, result) {
          expect(err).to.equal(false);
          expect(result.data).to.have.length(QTY_MOCK_MODELS);
  
          done();
        });
      });
    
      it('should return documents sorted (ASC) when present', function(done) {
        var options = {
          sorters: { name: 1 } 
        };
        Customer.paginate({}, options, function(err, result) {
          expect(err).to.equal(false);
          expect(result.data[0].name).to.contain('0');
  
          done();
        });
      });
    
      it('should return documents sorted (DESC) when present', function(done) {
        var options = {
          sorters: { name: -1 } 
        };
        Customer.paginate({}, options, function(err, result) {
          expect(err).to.equal(false);
          expect(result.data[0].name).to.contain('9');
  
          done();
        });
      });
    
      it('should return documents sorted when is function', function(done) {
        var options = {
          sorters: function(callback) {
            callback(false, { name: 1 });
          } 
        };
        Customer.paginate({}, options, function(err, result) {
          expect(err).to.equal(false);
          expect(result.data[0].name).to.contain('0');
  
          done();
        });
      });
    
      it('should return documents sorted when is string (JSON)', function(done) {
        var options = {
          sorters: '{"name": 1}' 
        };
        Customer.paginate({}, options, function(err, result) {
          expect(err).to.equal(false);
          expect(result.data[0].name).to.contain('0');
  
          done();
        });
      });
    });
  
    describe('option convertSorters', function() {
      it('should use default convert when not present', function(done) {
        var options = {
          sorters: '[{"property": "name", "direction": "DESC"}]',
          convertSorters: undefined 
        };
        Customer.paginate({}, options, function(err, result) {
          expect(err).to.equal(false);
          expect(result.data[0].name).to.contain('9');
  
          done();
        });
      });
    
      it('should throw exception when present and is not a function', function(done) {
        var options = {
          convertSorters: { x: 1 } 
        };
        Customer.paginate({}, options, function(err, result) {
          expect(err).to.exist;
  
          done();
        });
      });
    
      it('should convert sorters when present and is a function', function(done) {
        var options = {
          sorters: { any: -1 },
          convertSorters: function(sorters, callback) {
            if(sorters.hasOwnProperty('any')) {
              return callback(false, { name: sorters.any });
            }
            
            return callback(false, { name: 1 });
          }
        };
        Customer.paginate({}, options, function(err, result) {
          expect(err).to.equal(false);
          expect(result.data[0].name).to.contain('9');
  
          done();
        });
      });
    });
  
    describe('option criteriaWrapper', function() {
      it('should execute without problem when not present', function(done) {
        var options = {
          criteriaWrapper: undefined 
        };
        Customer.paginate({}, options, function(err, result) {
          expect(err).to.equal(false);
          expect(result.data).to.have.length(QTY_MOCK_MODELS);
  
          done();
        });
      });
    
      it('should execute without problem when present', function(done) {
        var options = {
          criteriaWrapper: function(criteria, callback) {
            // Ignore excluded documents logically
            criteria.deleted = false;
            
            callback(false, criteria);
          }
        };
        Customer.paginate({}, options, function(err, result) {
          expect(err).to.equal(false);
          expect(result.data).to.have.length(5);
  
          done();
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