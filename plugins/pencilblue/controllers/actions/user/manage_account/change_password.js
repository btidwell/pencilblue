/*
Copyright (C) 2016  PencilBlue, LLC

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

module.exports = function(pb) {

  //pb dependencies
  var util           = pb.util;
  var BaseController = pb.BaseController;
  var FormController = pb.FormController;

  /**
  * Changes the logged in user's password
  */
  function ChangePassword(){}
  util.inherits(ChangePassword, FormController);

  ChangePassword.prototype.render = function(cb) {
    var self = this;

    this.getJSONPostParams(function(err, post) {
      //sanitize
      post.current_password = pb.BaseObjectService.sanitize(post.current_password);
      post.new_password     = pb.BaseObjectService.sanitize(post.new_password);
      post.confirm_password = pb.BaseObjectService.sanitize(post.confirm_password);

      //validate
      var message;
      if(self.session.authentication.reset_password) {
        message = self.hasRequiredParams(post, ['new_password', 'confirm_password']);
      }
      else {
        message = self.hasRequiredParams(post, ['current_password', 'new_password', 'confirm_password']);
      }
      if(message) {
        return cb({
          code: 400,
          content: pb.BaseController.apiResponse(pb.BaseController.API_FAILURE, message)
        });
      }

      var where = pb.DAO.getIdWhere(self.session.authentication.user[pb.DAO.getIdField()]);
      if(!self.session.authentication.reset_password) {
        where.password = pb.security.encrypt(post.current_password);
      }
      delete post.current_password;

      if(post.new_password !== post.confirm_password) {
        cb({
          code: 400,
          content: pb.BaseController.apiResponse(pb.BaseController.API_FAILURE, self.ls.g('users.PASSWORD_MISMATCH'))
        });
        return;
      }

      post.password = post.new_password;
      delete post.new_password;
      delete post.confirm_password;

      var dao = new pb.DAO();
      dao.loadByValues(where, 'user', function(err, user) {
        if(util.isError(err) || user === null) {
          cb({
            code: 400,
            content: pb.BaseController.apiResponse(pb.BaseController.API_FAILURE, self.ls.g('users.INVALID_PASSWORD'))
          });
          return;
        }

        pb.DocumentCreator.update(post, user);
        dao.save(user, function(err/*, result*/) {
          if(util.isError(err)) {
            cb({
              code: 500,
              content: pb.BaseController.apiResponse(pb.BaseController.API_FAILURE, self.ls.g('generic.ERROR_SAVING'))
            });
            return;
          }

          self.session.authentication.reset_password = false;
          cb({
            content: pb.BaseController.apiResponse(pb.BaseController.API_SUCCESS, self.ls.g('users.PASSWORD_CHANGED'))
          });
        });
      });
    });
  };

  //exports
  return ChangePassword;
};
