import React from "react";

import { Checkbox, FormFieldGroup, Spinner } from "@instructure/ui";

import { urlParams } from "../../util";
import Feedback from "../Feedback";

class TimeeditTypeFilter extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            types: null,
            whitelist: null,
            isAdmin: true
        };
        this.refresh = this.refresh.bind(this);
        this.handleToggle = this.handleToggle.bind(this);
    }

    componentDidMount() {
        if (this.props.apiError) return;
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
                    throw new Error(
                        "User is unauthorized to update TimeEdit type filter"
                    );
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
                if (this.state.isAdmin && !this.props.apiError)
                    setTimeout(() => this.refresh(), 5000);
            });
        fetch(urlParams(window.injectedEnv.API_URL, "/api/timeedit/types", {}))
            .then(resp => {
                if (resp.status === 200) return resp.json();
                throw new Error(
                    "Something went wrong fetching timeedit types."
                );
            })
            .then(json => {
                this.setState({
                    types: Object.entries(json).map(([k, v]) => ({
                        extid: k,
                        title: v
                    }))
                });
            })
            .catch(e => {
                console.error(e);
                if (this.state.isAdmin && !this.props.apiError)
                    setTimeout(() => this.refresh(), 5000);
            });
    }

    handleToggle({ target }) {
        if (this.state.whitelist.includes(target.value)) {
            fetch(
                urlParams(
                    window.injectedEnv.API_URL,
                    "/api/config/whitelist-types",
                    {
                        te_type: target.value
                    }
                ),
                {
                    method: "DELETE"
                }
            )
                .then(resp => {
                    switch (resp.status) {
                        case 204:
                            this.refresh();
                            break;
                        case 400:
                        default:
                            throw new Error(
                                `Unexpected HTTP response from backend: ${resp.status} ${resp.statusText}`
                            );
                    }
                })
                .catch(e => console.error(e));
        } else {
            fetch(
                urlParams(
                    window.injectedEnv.API_URL,
                    "/api/config/whitelist-types",
                    {
                        te_type: target.value
                    }
                ),
                {
                    method: "POST"
                }
            )
                .then(resp => {
                    switch (resp.status) {
                        case 204:
                            this.refresh();
                            break;
                        case 400:
                        default:
                            throw new Error(
                                `Unexpected HTTP response from backend: ${resp.status} ${resp.statusText}`
                            );
                    }
                })
                .catch(e => console.error(e));
        }
    }

    render() {
        return (
            <>
                {this.state.isAdmin ? (
                    <>
                        <p>
                            This is a filter of which TimeEdit types to show
                            when adding Sync Objects.
                        </p>
                        {this.state.types &&
                        this.state.whitelist &&
                        !this.props.apiError ? (
                            <FormFieldGroup>
                                {this.state.types?.map(t => (
                                    <Checkbox
                                        size="small"
                                        variant="toggle"
                                        key={t.extid}
                                        value={t.extid}
                                        label={t.title}
                                        checked={this.state.whitelist.includes(
                                            t.extid
                                        )}
                                        onChange={this.handleToggle}
                                    />
                                ))}
                            </FormFieldGroup>
                        ) : (
                            <Spinner />
                        )}
                    </>
                ) : (
                    <Feedback
                        variant="error"
                        message="You must be a Canvas administrator to change TimeEdit type filter."
                    />
                )}
            </>
        );
    }
}

export default TimeeditTypeFilter;
