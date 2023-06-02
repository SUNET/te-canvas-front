import React from "react";

import { urlParams } from "../../util";
import ConfigSection from "./ConfigSection";

class Config extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            title: [],
            location: [],
            description: []
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
                if (resp.status !== 200)
                    throw new Error(
                        `Unexpected HTTP response from backend: ${resp.status}`
                    );
                return resp.json();
            })
            .then(data => this.setState(data))
            .catch(e => {
                console.error(e);
                setTimeout(this.refresh(), 2000);
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
                    title: this.state.title.filter(n => n.id !== id),
                    location: this.state.location.filter(n => n.id !== id),
                    description: this.state.description.filter(n => n.id !== id)
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
                    description fields in the canvas event will have. Thus, we
                    create a template with the Timeedit object fields we want to
                    use.
                </p>
                <ConfigSection
                    config_type="title"
                    default={this.props.default}
                    children={this.state.title}
                    onDelete={this.handleDelete}
                    onSubmit={this.refresh}
                />
                <ConfigSection
                    config_type="location"
                    default={this.props.default}
                    children={this.state.location}
                    onDelete={this.handleDelete}
                    onSubmit={this.refresh}
                />
                <ConfigSection
                    config_type="description"
                    default={this.props.default}
                    children={this.state.description}
                    onDelete={this.handleDelete}
                    onSubmit={this.refresh}
                />
            </>
        );
    }
}

export default Config;
