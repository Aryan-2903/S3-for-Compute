const express = require('express');
const router = express.Router();
const Function = require('../models/Function');
const Execution = require('../models/Execution');
// Use the global execution engine instance from server.js
const getExecutionEngine = () => {
  if (!global.executionEngine) {
    throw new Error('ExecutionEngine not initialized. Make sure server.js is running.');
  }
  return global.executionEngine;
};

// Get all functions
router.get('/', async (req, res) => {
  try {
    const functions = await Function.find().sort({ createdAt: -1 });
    res.json(functions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get function by ID
router.get('/:id', async (req, res) => {
  try {
    const func = await Function.findById(req.params.id);
    if (!func) {
      return res.status(404).json({ error: 'Function not found' });
    }
    res.json(func);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new function
router.post('/', async (req, res) => {
  try {
    const { name, description, code, config } = req.body;
    
    if (!name || !description || !code) {
      return res.status(400).json({ error: 'Name, description, and code are required' });
    }

    const func = new Function({
      name,
      description,
      code,
      config: config || {}
    });

    await func.save();
    res.status(201).json(func);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execute function
router.post('/:id/execute', async (req, res) => {
  try {
    const func = await Function.findById(req.params.id);
    if (!func) {
      return res.status(404).json({ error: 'Function not found' });
    }

    if (func.status !== 'active') {
      return res.status(400).json({ error: 'Function is not active' });
    }

    const input = req.body.input || {};
    const executionEngine = getExecutionEngine();
    const execution = await executionEngine.executeFunction(func, input);
    
    res.json({
      executionId: execution._id,
      status: execution.status,
      message: 'Function execution started'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get execution logs for a function
router.get('/:id/logs', async (req, res) => {
  try {
    const { limit = 50, status } = req.query;
    const query = { functionId: req.params.id };
    
    if (status) {
      query.status = status;
    }

    const executions = await Execution.find(query)
      .sort({ startTime: -1 })
      .limit(parseInt(limit));

    res.json(executions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update function
router.put('/:id', async (req, res) => {
  try {
    const { name, description, code, status, config } = req.body;
    
    const func = await Function.findById(req.params.id);
    if (!func) {
      return res.status(404).json({ error: 'Function not found' });
    }

    if (name) func.name = name;
    if (description) func.description = description;
    if (code) func.code = code;
    if (status) func.status = status;
    if (config) func.config = { ...func.config, ...config };

    await func.save();
    res.json(func);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete function
router.delete('/:id', async (req, res) => {
  try {
    const func = await Function.findByIdAndDelete(req.params.id);
    if (!func) {
      return res.status(404).json({ error: 'Function not found' });
    }
    res.json({ message: 'Function deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
