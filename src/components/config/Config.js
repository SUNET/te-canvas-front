import React from "react";

import { urlParams } from "../../util";
import Feedback from "../Feedback";
import ConfigSection from "./ConfigSection";

class Config extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            template: {
                title: [],
                location: [],
                description: []
            },
            isAdmin: true
        };
        this.handleDelete = this.handleDelete.bind(this);
        this.refresh = this.refresh.bind(this);
    }

    componentDidMount() {
        this.refresh();
    }

    refresh() {
        fetch(
            urlParams(window.injectedEnv.API_URL, "/api/config/template", {
                // MAGIC STRING ALERT: Is replaced on serverside with actual canvas_group.
                canvas_group: "LTI_CUSTOM_PROPERTY",
                default: this.props.default
            })
        )
            .then(resp => {
                if (resp.status === 403) {
                    this.setState({ isAdmin: false });
                    throw new Error(
                        "User is unauthorized to change default template"
                    );
                }
                if (resp.status !== 200 && resp.status !== 403)
                    throw new Error(
                        `Unexpected HTTP response from backend: ${resp.status}`
                    );
                return resp.json();
            })
            .then(data => this.setState({ template: data }))
            .catch(e => {
                console.error(e);
                this.state.isAdmin && setTimeout(() => this.refresh(), 2000);
            });
    }

    handleDelete(id) {
        fetch(
            urlParams(window.injectedEnv.API_URL, "/api/config/template", {
                id: id,
                // MAGIC STRING ALERT: Is replaced on serverside with actual canvas_group.
                canvas_group: "LTI_CUSTOM_PROPERTY"
            }),
            { method: "DELETE" }
        )
            .then(resp => {
                if (resp.status !== 204)
                    throw new Error(
                        `Unexpected HTTP response from backend: ${resp.status}`
                    );
                this.setState({
                    template: {
                        title: this.state.template.title.filter(
                            n => n.id !== id
                        ),
                        location: this.state.template.location.filter(
                            n => n.id !== id
                        ),
                        description: this.state.template.description.filter(
                            n => n.id !== id
                        )
                    }
                });
            })
            .catch(e => console.error(e));
    }

    render() {
        return (
            <>
                {this.props.default ? (
                    <p>
                        This is <strong>default</strong> event template. It is
                        used if an event template has not been configured for a
                        course.
                    </p>
                ) : (
                    <p>
                        This is the event template{" "}
                        <strong>for this course</strong>. If it is valid, it
                        will be used instead of the default event template.
                    </p>
                )}
                <p>
                    Event template control what content the title, location and
                    description fields in canvas events will have.
                </p>
                {this.state.isAdmin ? (
                    <>
                        <ConfigSection
                            config_type="title"
                            default={this.props.default}
                            children={this.state.template.title}
                            onDelete={this.handleDelete}
                            onSubmit={this.refresh}
                        />
                        <ConfigSection
                            config_type="location"
                            default={this.props.default}
                            children={this.state.template.location}
                            onDelete={this.handleDelete}
                            onSubmit={this.refresh}
                        />
                        <ConfigSection
                            config_type="description"
                            default={this.props.default}
                            children={this.state.template.description}
                            onDelete={this.handleDelete}
                            onSubmit={this.refresh}
                        />
                    </>
                ) : (
                    <Feedback
                        variant="error"
                        message="You must be a Canvas administrator to change default config."
                    />
                )}
            </>
        );
    }
}

export default Config;
