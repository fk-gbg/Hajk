import React from "react";
import Typography from "@material-ui/core/Typography";
import Chip from "@material-ui/core/Chip";
import { withStyles } from "@material-ui/core/styles";
import FeatureStyleChanger from "./FeatureStyleChanger";

const styles = (theme) => ({
  chip: {
    margin: theme.spacing(1),
  },
});

class Informationbar extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      anchorEl: null,
    };
  }

  renderInformation() {
    const { classes, model } = this.props;

    if (this.props.userMode === "Create" && this.props.type === "Contract") {
      return (
        <div>
          <Chip
            label={`Uppdaterar ${this.props.objectId}`}
            color="primary"
            className={classes.chip}
            variant="outlined"
          />
          <FeatureStyleChanger model={model} />
        </div>
      );
    } else if (
      this.props.userMode === "Create" &&
      (this.props.type === "Purchase" || this.props.type === "Sale")
    ) {
      return (
        <div>
          <Chip
            label={`Skapar ${model.options.displayConnections[
              this.props.type
            ].toLowerCase()}`}
            color="primary"
            className={classes.chip}
            variant="outlined"
          />
          <FeatureStyleChanger model={model} />
        </div>
      );
    } else if (this.props.userMode === "Show" && this.props.objectId) {
      return (
        <div>
          <Typography>
            Du visar nu{" "}
            {model.options.displayConnections[this.props.type].toLowerCase()}{" "}
            kopplade till:
            <br />
            <b>{this.props.objectId}</b>
          </Typography>
          <FeatureStyleChanger model={model} />
        </div>
      );
    } else if (
      this.props.model.promptForAttributes &&
      this.props.model.editFeatureId
    ) {
      return (
        <div>
          <Typography>
            Du visar nu{" "}
            {model.options.displayConnections[this.props.type].toLowerCase()}{" "}
            kopplade till:
            <br />
            <b>{this.props.objectId}</b>
          </Typography>
          <FeatureStyleChanger model={model} />
        </div>
      );
    } else {
      return (
        <div>
          <Chip
            label={`Du visar ingen yta just nu.`}
            color="primary"
            className={classes.chip}
            variant="outlined"
          />
        </div>
      );
    }
  }

  render() {
    return this.renderInformation();
  }
}

export default withStyles(styles)(Informationbar);