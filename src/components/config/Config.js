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
            .then(data => this.setState(data));
    }

    handleDelete(id) {
        fetch(
            urlParams(window.injectedEnv.API_URL, "/api/config/template", {
                id: id,
                // MAGIC STRING ALERT: Is replaced on serverside with actual canvas_group.
                canvas_group: "LTI_CUSTOM_PROPERTY"
            }),
            { method: "DELETE" }
        ).then(resp => {
            if (resp.status !== 204)
                throw new Error(
                    `Unexpected HTTP response from backend: ${resp.status}`
                );
            this.setState({
                title: this.state.title.filter(n => n.id !== id),
                location: this.state.location.filter(n => n.id !== id),
                description: this.state.description.filter(n => n.id !== id)
            });
        });
    }

    render() {
        return (
            <>
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
