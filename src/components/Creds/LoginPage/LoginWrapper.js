import React, { Component } from "react";
import PropTypes from "prop-types";
import LoginForm from "./LoginForm";

// UI wrapper for the input form
class LoginWrapper extends Component {
  // Callback that redirects to the createAccount page
  moveToCreate() {
    this.props.history.push("/createAccount/");
  }

  render() {
    return (
        <div>
          Log In:
          <LoginForm history={this.props.history}/>
          <input type="button"
                 value="Create Account"
                 onClick={this.moveToCreate.bind(this)}/>
        </div>
    );
  }
}

LoginWrapper.propTypes = {
  history: PropTypes.shape({
    push: PropTypes.func.isRequired
  })
};

export default LoginWrapper;
