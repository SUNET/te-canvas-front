import React from "react";

import {
    Button,
    Heading,
    IconPlusLine,
    IconTrashLine,
    View
} from "@instructure/ui";

import { urlParams } from "../../util";
import Feedback from "../Feedback";
import AddFieldForm from "./AddFieldForm";

class ConfigSection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            addNew: false
        };
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
    }

    handleCancel() {
        this.setState({
            addNew: false
        });
    }

    handleSubmit(type, field) {
        fetch(
            urlParams(window.injectedEnv.API_URL, "/api/config/template", {
                config_type: this.props.config_type,
                te_type: type,
                te_field: field,
                // MAGIC STRING ALERT: Is replaced on serverside with actual canvas_group.
                canvas_group: "LTI_CUSTOM_PROPERTY",
                default: this.props.default
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
                        this.props.onSubmit();
                        break;
                    case 400: // Already exist
                    default:
                        throw new Error(
                            `Unexpected HTTP response from backend: ${resp.status} ${resp.statusText}`
                        );
                }
            })
            .catch(e => console.error(e));
        this.setState({
            addNew: false
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
                <Heading level="h2">
                    {this.props.config_type.charAt(0).toUpperCase()}
                    {this.props.config_type.slice(1)}
                </Heading>
                <div>
                    {!this.state.addNew && this.props.children.length < 3 && (
                        <Button
                            renderIcon={IconPlusLine}
                            margin="small"
                            color="primary"
                            onClick={() =>
                                this.setState({
                                    addNew: true
                                })
                            }
                        >
                            Add {this.props.config_type} field
                        </Button>
                    )}
                    {this.props.children.length >= 3 && (
                        <Feedback
                            variant="info"
                            message="Maximum field count reached."
                        />
                    )}
                </div>
                {this.state.addNew && (
                    <AddFieldForm
                        onCancel={this.handleCancel}
                        onSubmit={this.handleSubmit}
                        existingFields={Object.values(this.props.children)}
                    />
                )}
                {this.props.children &&
                    this.props.children.map(c => (
                        <div key={c.id} style={{ marginBottom: 10 }}>
                            <Button
                                onClick={() => this.props.onDelete(c.id)}
                                renderIcon={IconTrashLine}
                            >
                                <strong>{c.te_type}</strong>-{c.te_field}
                            </Button>
                        </div>
                    ))}
            </View>
        );
    }
}

export default ConfigSection;
