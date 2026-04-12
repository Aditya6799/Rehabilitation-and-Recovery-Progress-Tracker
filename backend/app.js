
// app.js — Main Backend Server
// Rehabilitation & Recovery Progress Tracker
// Routes + Controllers + Middleware (Single File Architecture)


require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { connectDB, User, Exercise, Progress, Appointment, Chat } = require('./db');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database 
connectDB();

// Global Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Gemini AI Setup 
let genAI;
let geminiModel;
try {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
} catch (err) {
  console.warn('⚠️  Gemini AI not configured. Chat will return fallback responses.');
}


// MIDDLEWARE


/**
 * authMiddleware — Verifies JWT token from Authorization header.
 * Attaches decoded user data (id, role) to req.user.
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

/**
 * roleMiddleware — Checks if the authenticated user has the required role.
 * @param  {...string} roles - Allowed roles (e.g., 'doctor', 'patient')
 */
const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. This action requires one of the following roles: ${roles.join(', ')}`
      });
    }
    next();
  };
};


// AUTH ROUTES

/**
 * POST /api/register
 * Register a new user (patient or doctor)
 */
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (!['patient', 'doctor'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either "patient" or "doctor".' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role
    });

    res.status(201).json({
      message: 'Registration successful. Please login.',
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

/**
 * POST /api/login
 * Authenticate user and return JWT token
 */
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});


// PROFILE ROUTES

/**
 * GET /api/profile
 * Get authenticated user's profile
 */
app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error fetching profile.' });
  }
});

/**
 * PUT /api/profile
 * Update authenticated user's profile
 */
app.put('/api/profile', authMiddleware, async (req, res) => {
  try {
    const allowedFields = ['name', 'phone', 'bio', 'specialization', 'licenseNumber', 'medicalHistory'];
    const updates = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Handle password change
    if (req.body.currentPassword && req.body.newPassword) {
      const user = await User.findById(req.user.id);
      const isMatch = await bcrypt.compare(req.body.currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }
      if (req.body.newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters.' });
      }
      const salt = await bcrypt.genSalt(12);
      updates.password = await bcrypt.hash(req.body.newPassword, salt);
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ message: 'Profile updated successfully.', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error updating profile.' });
  }
});

// DASHBOARD ROUTE
/**
 * GET /api/dashboard
 * Returns aggregated dashboard data based on user role
 */
app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'patient') {
      const [progressEntries, exercises, appointments, recentProgress] = await Promise.all([
        Progress.countDocuments({ userId: req.user.id }),
        Exercise.find({ assignedTo: req.user.id }).limit(5).populate('createdBy', 'name'),
        Appointment.find({ patientId: req.user.id }).sort({ date: -1 }).limit(5).populate('doctorId', 'name specialization'),
        Progress.find({ userId: req.user.id }).sort({ date: -1 }).limit(30)
      ]);

      const latestProgress = recentProgress[0] || null;
      const avgPain = recentProgress.length > 0
        ? (recentProgress.reduce((sum, p) => sum + p.painLevel, 0) / recentProgress.length).toFixed(1)
        : 0;
      const avgCompletion = recentProgress.length > 0
        ? Math.round(recentProgress.reduce((sum, p) => sum + p.exerciseCompletion, 0) / recentProgress.length)
        : 0;

      res.json({
        role: 'patient',
        stats: {
          totalSessions: progressEntries,
          averagePainLevel: parseFloat(avgPain),
          averageCompletion: avgCompletion,
          assignedExercises: exercises.length
        },
        exercises,
        appointments,
        recentProgress,
        latestProgress
      });
    } else if (req.user.role === 'doctor') {
      const [patients, exercises, appointments, recentAppointments] = await Promise.all([
        User.find({ role: 'patient', assignedDoctor: req.user.id }).select('-password'),
        Exercise.countDocuments({ createdBy: req.user.id }),
        Appointment.countDocuments({ doctorId: req.user.id }),
        Appointment.find({ doctorId: req.user.id }).sort({ date: -1 }).limit(10).populate('patientId', 'name email')
      ]);

      res.json({
        role: 'doctor',
        stats: {
          totalPatients: patients.length,
          totalExercises: exercises,
          totalAppointments: appointments,
          pendingAppointments: recentAppointments.filter(a => a.status === 'pending').length
        },
        patients,
        recentAppointments
      });
    }
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Server error fetching dashboard data.' });
  }
});


// EXERCISE ROUTES

/**
 * POST /api/exercises
 * Create a new exercise (Doctor only)
 */
app.post('/api/exercises', authMiddleware, roleMiddleware('doctor'), async (req, res) => {
  try {
    const { title, category, duration, difficulty, instructions, targetArea, assignedTo } = req.body;

    if (!title || !category || !duration || !instructions) {
      return res.status(400).json({ error: 'Title, category, duration, and instructions are required.' });
    }

    const exercise = await Exercise.create({
      title,
      category,
      duration,
      difficulty: difficulty || 'beginner',
      instructions,
      targetArea: targetArea || '',
      createdBy: req.user.id,
      assignedTo: assignedTo || []
    });

    res.status(201).json({ message: 'Exercise created successfully.', exercise });
  } catch (error) {
    console.error('Create exercise error:', error);
    res.status(500).json({ error: 'Server error creating exercise.' });
  }
});

/**
 * GET /api/exercises
 * Get exercises (all for doctors, assigned for patients)
 */
app.get('/api/exercises', authMiddleware, async (req, res) => {
  try {
    let exercises;
    if (req.user.role === 'doctor') {
      exercises = await Exercise.find({ createdBy: req.user.id })
        .populate('createdBy', 'name')
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 });
    } else {
      exercises = await Exercise.find({
        $or: [{ assignedTo: req.user.id }, { assignedTo: { $size: 0 } }]
      })
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 });
    }

    res.json(exercises);
  } catch (error) {
    console.error('Get exercises error:', error);
    res.status(500).json({ error: 'Server error fetching exercises.' });
  }
});

/**
 * PUT /api/exercises/:id
 * Update an exercise (Doctor only)
 */
app.put('/api/exercises/:id', authMiddleware, roleMiddleware('doctor'), async (req, res) => {
  try {
    const exercise = await Exercise.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found or unauthorized.' });
    }

    res.json({ message: 'Exercise updated successfully.', exercise });
  } catch (error) {
    console.error('Update exercise error:', error);
    res.status(500).json({ error: 'Server error updating exercise.' });
  }
});

/**
 * DELETE /api/exercises/:id
 * Delete an exercise (Doctor only)
 */
app.delete('/api/exercises/:id', authMiddleware, roleMiddleware('doctor'), async (req, res) => {
  try {
    const exercise = await Exercise.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found or unauthorized.' });
    }

    res.json({ message: 'Exercise deleted successfully.' });
  } catch (error) {
    console.error('Delete exercise error:', error);
    res.status(500).json({ error: 'Server error deleting exercise.' });
  }
});

// PROGRESS ROUTES

/**
 * POST /api/progress
 * Log progress (Patient only)
 */
app.post('/api/progress', authMiddleware, roleMiddleware('patient'), async (req, res) => {
  try {
    const { date, painLevel, exerciseCompletion, mood, notes, exercisesCompleted } = req.body;

    if (painLevel === undefined || exerciseCompletion === undefined) {
      return res.status(400).json({ error: 'Pain level and exercise completion are required.' });
    }

    const progress = await Progress.create({
      userId: req.user.id,
      date: date || new Date(),
      painLevel,
      exerciseCompletion,
      mood: mood || 'okay',
      notes: notes || '',
      exercisesCompleted: exercisesCompleted || []
    });

    res.status(201).json({ message: 'Progress logged successfully.', progress });
  } catch (error) {
    console.error('Create progress error:', error);
    res.status(500).json({ error: 'Server error logging progress.' });
  }
});

/**
 * GET /api/progress/:userId
 * Get progress for a user (own data or doctor viewing patient)
 */
app.get('/api/progress/:userId', authMiddleware, async (req, res) => {
  try {
    // Patients can only view own data, doctors can view any patient
    if (req.user.role === 'patient' && req.user.id !== req.params.userId) {
      return res.status(403).json({ error: 'You can only view your own progress.' });
    }

    const progress = await Progress.find({ userId: req.params.userId })
      .sort({ date: -1 })
      .limit(100)
      .populate('exercisesCompleted.exerciseId', 'title');

    res.json(progress);
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Server error fetching progress.' });
  }
});

/**
 * GET /api/progress
 * Get own progress (shortcut for patients)
 */
app.get('/api/progress', authMiddleware, async (req, res) => {
  try {
    const progress = await Progress.find({ userId: req.user.id })
      .sort({ date: -1 })
      .limit(100);

    res.json(progress);
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Server error fetching progress.' });
  }
});

// APPOINTMENT ROUTES

/**
 * POST /api/appointments
 * Book an appointment (Patient only)
 */
app.post('/api/appointments', authMiddleware, roleMiddleware('patient'), async (req, res) => {
  try {
    const { doctorId, date, time, reason } = req.body;

    if (!doctorId || !date || !time || !reason) {
      return res.status(400).json({ error: 'Doctor, date, time, and reason are required.' });
    }

    // Verify doctor exists
    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    const appointment = await Appointment.create({
      patientId: req.user.id,
      doctorId,
      date,
      time,
      reason
    });

    // Assign patient to doctor if not already assigned
    await User.findByIdAndUpdate(req.user.id, { assignedDoctor: doctorId });

    const populated = await Appointment.findById(appointment._id)
      .populate('doctorId', 'name specialization')
      .populate('patientId', 'name email');

    res.status(201).json({ message: 'Appointment booked successfully.', appointment: populated });
  } catch (error) {
    console.error('Book appointment error:', error);
    res.status(500).json({ error: 'Server error booking appointment.' });
  }
});

/**
 * GET /api/appointments
 * Get appointments based on role
 */
app.get('/api/appointments', authMiddleware, async (req, res) => {
  try {
    let appointments;
    if (req.user.role === 'patient') {
      appointments = await Appointment.find({ patientId: req.user.id })
        .populate('doctorId', 'name specialization')
        .sort({ date: -1 });
    } else {
      appointments = await Appointment.find({ doctorId: req.user.id })
        .populate('patientId', 'name email')
        .sort({ date: -1 });
    }

    res.json(appointments);
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ error: 'Server error fetching appointments.' });
  }
});

/**
 * PUT /api/appointments/:id
 * Update appointment status (Doctor only)
 */
app.put('/api/appointments/:id', authMiddleware, roleMiddleware('doctor'), async (req, res) => {
  try {
    const { status, notes } = req.body;

    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, doctorId: req.user.id },
      { $set: { status, notes: notes || '' } },
      { new: true, runValidators: true }
    ).populate('patientId', 'name email');

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found or unauthorized.' });
    }

    res.json({ message: 'Appointment updated successfully.', appointment });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ error: 'Server error updating appointment.' });
  }
});

/**
 * GET /api/doctors
 * Get list of all doctors (for patient to select when booking)
 */
app.get('/api/doctors', authMiddleware, async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' }).select('name email specialization');
    res.json(doctors);
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({ error: 'Server error fetching doctors.' });
  }
});

/**
 * GET /api/patients
 * Get list of all patients (for doctor)
 */
app.get('/api/patients', authMiddleware, roleMiddleware('doctor'), async (req, res) => {
  try {
    const patients = await User.find({ role: 'patient' }).select('name email phone createdAt');
    res.json(patients);
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ error: 'Server error fetching patients.' });
  }
});

// CHAT ROUTES (GEMINI AI INTEGRATION)

/**
 * POST /api/chat
 * Send message to Gemini AI and get a response
 */
app.post('/api/chat', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // Find or create chat session for user
    let chat = await Chat.findOne({ userId: req.user.id });
    if (!chat) {
      chat = await Chat.create({ userId: req.user.id, messages: [] });
    }

    // Add user message
    chat.messages.push({ role: 'user', content: message.trim() });

    let aiResponse;

    if (geminiModel) {
      // Build context for Gemini
      const systemPrompt = `You are a helpful rehabilitation and recovery assistant called "Recovery AI". 
You help patients with their rehabilitation journey by providing:
- Exercise guidance and tips
- Pain management advice
- Motivation and encouragement
- General health and wellness information
- Answers about rehabilitation processes

Important: You are NOT a replacement for medical professionals. Always recommend consulting with their doctor for medical decisions.
Keep responses concise, helpful, and empathetic. Use simple language.`;

      const recentMessages = chat.messages.slice(-10).map(m =>
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
      ).join('\n');

      const prompt = `${systemPrompt}\n\nConversation History:\n${recentMessages}\n\nUser: ${message.trim()}\nAssistant:`;

      try {
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        aiResponse = response.text();
      } catch (aiError) {
        console.error('Gemini API error:', aiError);
        aiResponse = "I'm having trouble connecting to my AI service right now. Please try again shortly, or contact your healthcare provider for immediate assistance.";
      }
    } else {
      // Fallback responses when Gemini is not configured
      const fallbacks = [
        "Thank you for your message! I'm here to help with your rehabilitation journey. While my AI connection is being set up, please don't hesitate to reach out to your healthcare provider for personalized advice.",
        "I appreciate your question! My advanced AI features are currently being configured. In the meantime, remember to stay consistent with your exercises and track your progress daily.",
        "Thanks for reaching out! While I'm getting my full capabilities online, here's a tip: gentle stretching before your rehabilitation exercises can help reduce discomfort and improve outcomes."
      ];
      aiResponse = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    // Add assistant response
    chat.messages.push({ role: 'assistant', content: aiResponse });
    await chat.save();

    res.json({
      message: aiResponse,
      chatId: chat._id
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Server error processing chat message.' });
  }
});

/**
 * GET /api/chat
 * Get chat history for authenticated user
 */
app.get('/api/chat', authMiddleware, async (req, res) => {
  try {
    const chat = await Chat.findOne({ userId: req.user.id });
    res.json(chat ? chat.messages : []);
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ error: 'Server error fetching chat history.' });
  }
});


// HEALTH CHECK

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// START SERVER

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   Rehab Tracker API Server                   ║
  ║   Running on http://localhost:${PORT}            ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}              ║
  ╚══════════════════════════════════════════════╝
  `);
});
