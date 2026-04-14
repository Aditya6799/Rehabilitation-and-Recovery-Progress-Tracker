// db.js — MongoDB Atlas Connection & Mongoose Schemas
// Rehabilitation & Recovery Progress Tracker

const mongoose = require('mongoose');

// Connect to MongoDB Atlas 
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// User Schema 
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  role: {
    type: String,
    enum: ['patient', 'doctor'],
    required: [true, 'Role is required']
  },
  phone: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  specialization: {
    type: String,
    default: ''
  },
  licenseNumber: {
    type: String,
    default: ''
  },
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  medicalHistory: {
    type: String,
    default: ''
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Exercise Schema 
const exerciseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Exercise title is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['stretching', 'strengthening', 'balance', 'cardio', 'flexibility', 'mobility', 'other']
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: 1
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  instructions: {
    type: String,
    required: [true, 'Instructions are required']
  },
  targetArea: {
    type: String,
    default: ''
  },
  videoUrl: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

const Exercise = mongoose.model('Exercise', exerciseSchema);

// Progress Schema 
const progressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  painLevel: {
    type: Number,
    required: [true, 'Pain level is required'],
    min: 0,
    max: 10
  },
  exerciseCompletion: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  mood: {
    type: String,
    enum: ['great', 'good', 'okay', 'bad', 'terrible'],
    default: 'okay'
  },
  notes: {
    type: String,
    default: ''
  },
  exercisesCompleted: [{
    exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
    completed: { type: Boolean, default: false }
  }]
}, { timestamps: true });

const Progress = mongoose.model('Progress', progressSchema);

// Appointment Schema 
const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  time: {
    type: String,
    required: [true, 'Time is required']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

const Appointment = mongoose.model('Appointment', appointmentSchema);

// Chat Schema
const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

const Chat = mongoose.model('Chat', chatSchema);

// Feedback Schema
const feedbackSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Feedback content is required'],
    trim: true
  },
  actionableSteps: [{
    text: { type: String, required: true },
    completed: { type: Boolean, default: false }
  }],
  category: {
    type: String,
    enum: ['milestone', 'exercise', 'pain-management', 'general', 'motivation'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  read: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const Feedback = mongoose.model('Feedback', feedbackSchema);

// Export
module.exports = {
  connectDB,
  User,
  Exercise,
  Progress,
  Appointment,
  Chat,
  Feedback
};
