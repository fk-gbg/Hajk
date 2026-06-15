import React from "react";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { styled } from "@mui/material/styles";
import FeatureStyleChanger from "./FeatureStyleChanger";

const StyledChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(1),
}));

class Informationbar extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      anchorEl: null,
    };
  }

  renderInformation() {
    const { model } = this.props;

    if (this.props.userMode === "Create" && this.props.type === "Contract") {
      return (
        <div>
          <StyledChip
            label={`Uppdaterar ${this.props.objectId}`}
            color="primary"
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
          <StyledChip
            label={`Skapar ${model.options.displayConnections[
              this.props.type
            ].toLowerCase()}`}
            color="primary"
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
          <StyledChip
            label={`Du visar ingen yta just nu.`}
            color="primary"
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

export default Informationbar;
