const express = require('express');
const router = express.Router();
const controllers = require('./controllers');
const { authMiddleware, roleMiddleware } = require('./middleware');

// --- AUTH ROUTES ---
router.post('/register', controllers.register);
router.post('/login', controllers.login);

// --- PROFILE ROUTES ---
router.get('/profile', authMiddleware, controllers.getProfile);
router.put('/profile', authMiddleware, controllers.updateProfile);

// --- DASHBOARD ROUTE ---
router.get('/dashboard', authMiddleware, controllers.getDashboard);

// --- EXERCISE ROUTES ---

router.post('/exercises', authMiddleware, roleMiddleware('doctor'), controllers.createExercise);
router.get('/exercises', authMiddleware, controllers.getExercises);
router.put('/exercises/:id', authMiddleware, roleMiddleware('doctor'), controllers.updateExercise);
router.delete('/exercises/:id', authMiddleware, roleMiddleware('doctor'), controllers.deleteExercise);

// --- PROGRESS ROUTES ---
// Important: Place the exact route before the parameterized route
router.get('/progress', authMiddleware, controllers.getOwnProgress);
router.post('/progress', authMiddleware, roleMiddleware('patient'), controllers.logProgress);
router.get('/progress/:userId', authMiddleware, controllers.getUserProgress);

// --- APPOINTMENT ROUTES ---

router.post('/appointments', authMiddleware, roleMiddleware('patient'), controllers.bookAppointment);
router.get('/appointments', authMiddleware, controllers.getAppointments);
router.put('/appointments/:id', authMiddleware, roleMiddleware('doctor'), controllers.updateAppointmentStatus);
router.get('/doctors', authMiddleware, controllers.getDoctors);
router.get('/patients', authMiddleware, roleMiddleware('doctor'), controllers.getPatients);

// --- FEEDBACK ROUTES ---

router.post('/feedback', authMiddleware, roleMiddleware('doctor'), controllers.createFeedback);
router.get('/feedback', authMiddleware, controllers.getFeedback);
router.put('/feedback/:id/read', authMiddleware, roleMiddleware('patient'), controllers.markFeedbackRead);
router.put('/feedback/:id/step/:stepIndex', authMiddleware, roleMiddleware('patient'), controllers.toggleFeedbackStep);

// --- CHAT ROUTES ---

router.post('/chat', authMiddleware, controllers.chat);
router.get('/chat', authMiddleware, controllers.getChatHistory);

// --- HEALTH CHECK ---

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
