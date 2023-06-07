import React from "react";

import { urlParams } from "../../util";

class WhitelistTypes extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            whitelist: null,
            isAdmin: true
        };
        this.refresh = this.refresh.bind(this);
    }

    componentDidMount() {
        this.refresh();
    }

    refresh() {
        fetch(
            urlParams(
                window.injectedEnv.API_URL,
                "/api/config/whitelist-types",
                {}
            )
        )
            .then(resp => {
                if (resp.status === 403) {
                    this.setState({ isAdmin: false });
                    throw new Error("User is unauthorized to update whitelist");
                }
                if (resp.status !== 200 && resp.status !== 403)
                    throw new Error(
                        `Unexpected HTTP response from backend: ${resp.status}`
                    );
                return resp.json();
            })
            .then(data => this.setState({ whitelist: data }))
            .catch(e => {
                console.error(e);
                this.state.isAdmin && setTimeout(() => this.refresh(), 2000);
            });
    }

    render() {
        return (
            <>
                {this.state.whitelist?.map(w => (
                    <p key={w}>{w}</p>
                ))}
            </>
        );
    }
}

export default WhitelistTypes;
