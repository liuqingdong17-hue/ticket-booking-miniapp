const express = require('express');
const router = express.Router();
const userController = require('../controllers/user'); // ✅ 这里导入 userController
const auth = require('../middlewares/auth');

router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);
router.get('/info', auth, userController.getUserInfo); // ✅ 改这里：userHandler → userController
router.get('/stats', auth, userController.getUserStats);

module.exports = router;
