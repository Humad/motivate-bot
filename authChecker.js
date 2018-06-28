module.exports = function authChecker(req, res, next) {
	if (!req.user) {
		res.redirect('/login');
	} else {
		next();
	}
}