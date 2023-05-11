import React from "react";

import { Alert } from "@instructure/ui";

class Feedback extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        return this.props.message ? (
            <Alert variant={this.props.variant} margin="small">
                {this.props.message}
            </Alert>
        ) : null;
    }
}

export default Feedback;
