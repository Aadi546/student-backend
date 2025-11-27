const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const{ body , validationResult ,param}=require('express-validator');
// All CRUD endpoints go here; for example:
const auth=require('../middleware/auth');

router.post('/',  [
    body('name')
      .isLength({ min: 2 })
      .withMessage('Name must be at least 2 characters long'),
    body('email')
      .isEmail()
      .withMessage('Email must be valid'),
    body('age')
      .optional()
      .isInt({ min: 1, max: 120 })
      .withMessage('Age must be a number between 1 and 120'),
  ],
  async (req, res) => { 
    // 1. Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // 2. If valid, create student
    try {
        const student = new Student(req.body);
        await student.save();
        res.status(201).json(student);
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
});
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const students = await Student.find()
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit);

    const total = await Student.countDocuments();

    res.json({
      success: true,
      data: students,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (err) {
    next(err); // Let global handler catch it
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedStudent) return res.status(404).json({ error: "Not found" });
    res.json(updatedStudent);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid ObjectId')
], async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) return res.status(404).json({ error: "Not found" });
        res.json(student);
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
});
router.delete('/:id',auth, async (req, res) => {
    try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
// ...rest of the endpoints

module.exports = router;
