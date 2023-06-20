import React from "react";

import { Button, SimpleSelect, Spinner, View } from "@instructure/ui";
import { IconPlusLine, IconTrashLine } from "@instructure/ui-icons";

import { MyContext, createField, urlParams } from "../util";
import AsyncSelect from "./AsyncSelect";
import Feedback from "./Feedback";
import SyncStatus from "./SyncStatus";

class Sync extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            searchObjects: [],
            feedbackMessage: null,
            apiErrorConnection: false
        };

        this.refresh = this.refresh.bind(this);
        this.feedback = this.feedback.bind(this);
    }

    componentDidMount() {
        this.refresh();
    }

    refresh() {
        // This outer fetch gets a list of connections on the form
        // { canvas_group: <id>, te_group: <id>, delete_flag: <bool>, te_type: <extid> }
        fetch(
            urlParams(window.injectedEnv.API_URL, "/api/connection", {
                // MAGIC STRING ALERT: Is replaced on serverside with actual canvas_group.
                canvas_group: "LTI_CUSTOM_PROPERTY"
            })
        )
            .then(resp => {
                if (resp.status !== 200) {
                    this.setState({ apiErrorConnection: true });
                    throw new Error(
                        `Unexpected HTTP response from backend: ${resp.status}`
                    );
                }
                return resp.json();
            })
            .then(connections => {
                // We then go through each connection and start an asynchronous
                // fetch to get TimeEdit details for each connection. This fills
                // out state.searchObjects and allows us to present the search
                // objects in a user-friendly format.

                let promises = [];

                connections
                    .filter(c => !c.delete_flag)
                    .forEach(c => {
                        let details = fetch(
                            urlParams(
                                window.injectedEnv.API_URL,
                                "/api/timeedit/object",
                                {
                                    extid: c.te_group
                                }
                            )
                        )
                            .then(resp => {
                                if (resp.status !== 200)
                                    throw new Error(
                                        `Unexpected HTTP response from backend: ${resp.status} ${resp.statusText}`
                                    );
                                return resp.json();
                            })
                            .then(data => ({
                                extid: data.extid,
                                type: c.te_type, // TODO: Convert this to a type name using /api/timeedit/types
                                id: createField(data, "id"),
                                title: createField(data, "title")
                            }))
                            .catch(e => {
                                // This will lead Promise.all to also reject at
                                // (1), which is caught at (2).
                                return Promise.reject(e);
                            });
                        promises.push(details);
                    });

                return Promise.all(promises); // (1)
            })
            .then(searchObjects => {
                this.setState({
                    searchObjects: searchObjects,
                    apiErrorConnection: false
                });
            })
            .catch(e => {
                console.error(e);
                this.setState({ apiErrorConnection: true });
                if (!this.props.apiError)
                    setTimeout(() => this.refresh(), 5000);
            }); // (2)
    }

    feedback(message) {
        this.setState({
            feedbackMessage: message
        });
        setTimeout(() => this.setState({ feedbackMessage: null }), 2000);
    }
    render() {
        return (
            <MyContext.Provider
                value={{
                    refresh: this.refresh,
                    feedback: this.feedback
                }}
            >
                <Feedback message={this.state.feedbackMessage} />
                {this.props.apiError ? (
                    <Spinner />
                ) : (
                    <>
                        {this.state.apiErrorConnection ||
                        this.state.searchObjects.length === 0 ? (
                            <Spinner />
                        ) : (
                            <div id="sync">
                                <SyncStatus
                                    connections={
                                        this.state.searchObjects.length
                                    }
                                />
                                <SearchObjects
                                    refresh={this.refresh}
                                    searchObjects={this.state.searchObjects}
                                />
                                <AddNew />
                            </div>
                        )}
                    </>
                )}
            </MyContext.Provider>
        );
    }
}

class SearchObjects extends React.Component {
    render() {
        return (
            <>
                {Object.entries(this.props.searchObjects).map(([k, v]) => (
                    <SearchObject key={k} {...v} />
                ))}
            </>
        );
    }
}

class SearchObject extends React.Component {
    constructor(props) {
        super(props);
        this.delete = this.delete.bind(this);
    }

    static contextType = MyContext; // Telling React that I want to use the context provider I have defined

    delete(id) {
        fetch(
            urlParams(window.injectedEnv.API_URL, "/api/connection", {
                te_group: id,
                canvas_group: "LTI_CUSTOM_PROPERTY"
            }),
            {
                method: "DELETE"
            }
        )
            .then(resp => {
                // We only want to check for response code 204. Response 409 (where a
                // connection has delete_flag set but has not been deleted yet) is not
                // relevant since connections with delete_flag set are not shown.
                if (resp.status !== 204)
                    throw new Error(
                        `Unexpected HTTP response from backend: ${resp.status} ${resp.statusText}`
                    );
                this.context.refresh();
            })
            .catch(e => {
                console.error(e);
                this.context.feedback(
                    "Unable to delete Sync Object %s",
                    te_group
                );
            });
    }

    render() {
        return (
            <View
                display="block"
                borderRadius="medium"
                borderWidth="small"
                background="secondary"
                padding="medium"
                margin="small"
            >
                <div
                    className="search-object"
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}
                >
                    <div>Title: {this.props.title}</div>
                    <div>Id: {this.props.id}</div>
                    <Button
                        renderIcon={IconTrashLine}
                        onClick={() => this.delete(this.props.extid)}
                    >
                        Remove
                    </Button>
                </div>
            </View>
        );
    }
}

class AddNew extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            active: false
        };
        this.setActive = this.setActive.bind(this);
    }

    setActive(b) {
        this.setState({
            active: b
        });
    }

    render() {
        return this.state.active ? (
            <AddNewForm setActive={this.setActive} />
        ) : (
            <Button
                renderIcon={IconPlusLine}
                margin="small"
                color="primary"
                onClick={() => this.setActive(true)}
            >
                Add Object
            </Button>
        );
    }
}

class AddNewForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            type: null,
            types: [],
            object: null,
            apiErrorType: false
        };
        this.handleSelect = this.handleSelect.bind(this);
        this.submit = this.submit.bind(this);
        this.setObject = this.setObject.bind(this);
        this.getTypes = this.getTypes.bind(this);
    }

    static contextType = MyContext;

    getTypes() {
        fetch(
            urlParams(window.injectedEnv.API_URL, "/api/timeedit/types", {
                whitelisted: "true"
            })
        )
            .then(resp => {
                if (resp.status !== 200) {
                    this.setState({ apiErrorType: true });
                    throw new Error(
                        `Unexpected HTTP response from backend: ${resp.status} ${resp.statusText}`
                    );
                }
                return resp.json();
            })
            .then(json => {
                this.setState({
                    types: Object.entries(json).map(([k, v]) => ({
                        extid: k,
                        title: v
                    })),
                    // If the types include "courseevt" we set this as active.
                    // Otherwise just pick the first type.
                    type: Object.keys(json).some(x => x === "courseevt")
                        ? "courseevt"
                        : Object.keys(json)[0],
                    apiErrorType: false
                });
            })
            .catch(e => {
                console.error(e);
                if (!this.props.apiError)
                    setTimeout(() => this.getTypes(), 5000);
            });
    }

    componentDidMount() {
        this.getTypes();
    }

    handleSelect(key) {
        return (_, { value }) => {
            this.setState({ [key]: value });
        };
    }

    submit() {
        if (!this.state.object || !this.state.type) {
            this.context.feedback(
                "We need both object and type to add a connection"
            );
            return;
        }
        fetch(
            urlParams(window.injectedEnv.API_URL, "/api/connection", {
                te_group: this.state.object,
                te_type: this.state.type,
                canvas_group: "LTI_CUSTOM_PROPERTY"
            }),
            {
                method: "POST"
            } // TODO: Does not work with "Content-Type" header added (CORS)
        )
            .then(resp => {
                switch (resp.status) {
                    case 204: // Success, no content
                        // We don't adjust the state manually, instead we fetch a new
                        // state from the server. Since we wait for the POST fetch
                        // to complete, we know that the following GET will include our
                        // new connection.
                        this.context.refresh();
                        this.props.setActive(false);
                        break;
                    case 404: // Already exists
                    case 409:
                        resp.json()
                            .then(json => this.context.feedback(json.message))
                            .catch(e => console.error(e));
                        break;
                    default:
                        throw new Error(
                            `Unexpected HTTP response from backend: ${resp.status} ${resp.statusText}`
                        );
                }
            })
            .catch(e => {
                this.context.feedback("Error adding Sync Object connection");
                console.error(e);
            });
    }

    setObject(object) {
        this.setState({
            object: object
        });
    }

    render() {
        return (
            <>
                {!this.state.apiErrorType ? (
                    <View
                        display="block"
                        borderRadius="medium"
                        borderWidth="small"
                        background="secondary"
                        padding="medium"
                        margin="small"
                    >
                        <SimpleSelect
                            renderLabel="Object Type"
                            value={this.state.type}
                            onChange={this.handleSelect("type")}
                        >
                            {this.state.types.map(t => (
                                <SimpleSelect.Option
                                    key={t.extid}
                                    id={t.extid}
                                    value={t.extid}
                                >
                                    {t.title}
                                </SimpleSelect.Option>
                            ))}
                        </SimpleSelect>
                        <br />
                        <AsyncSelect
                            type={this.state.type}
                            setObject={this.setObject}
                        />
                        <br />
                        <Button onClick={this.submit}>Submit</Button>{" "}
                        <Button onClick={() => this.props.setActive(false)}>
                            Cancel
                        </Button>
                    </View>
                ) : (
                    <Spinner />
                )}
            </>
        );
    }
}

export default Sync;
