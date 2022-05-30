import React from "react";

import { Alert } from "@instructure/ui";

class Feedback extends React.Component {
    render() {
        return this.props.message ? (
            <Alert variant="error" margin="small">
                {this.props.message}
            </Alert>
        ) : null;
    }
}

export default Feedback;
