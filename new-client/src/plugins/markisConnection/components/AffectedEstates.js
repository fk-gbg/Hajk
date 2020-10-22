import React from "react";
import Typography from "@material-ui/core/Typography";
import { withStyles } from "@material-ui/core/styles";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import Tooltip from "@material-ui/core/Tooltip";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";

const styles = (theme) => ({
  root: {
    width: "100%",
  },
  details: {
    maxHeight: 300,
    overflow: "auto",
  },
  affectedEstateDetails: {
    color: theme.palette.text.secondary,
  },
});

const StyledAccordionSummary = withStyles((theme) => ({
  root: {
    backgroundColor: theme.palette.background.default,
    borderBottom: `1px solid ${theme.palette.divider}`,
    color: theme.palette.text.secondary,
    padding: theme.spacing(1),
    marginBottom: 0,
    minHeight: 10,
    maxHeight: 40,
  },
}))(AccordionSummary);

class AffectedEstates extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      contractInformation: null,
      editFeatureId: props.model.editFeatureId,
      promptForAttributes: props.model.promptForAttributes,
    };

    props.localObserver.subscribe("feature-modified", (vectorSource) => {
      props.model.getAreaAndAffectedEstates((r) => {
        this.setState({
          contractInformation: r,
          editFeatureId: props.model.editFeatureId,
          promptForAttributes: props.model.promptForAttributes,
        });
      });
    });

    props.localObserver.subscribe("feature-added", (message) => {
      props.model.getAreaAndAffectedEstates((r) => {
        this.setState({
          contractInformation: r,
          editFeatureId: props.model.editFeatureId,
          promptForAttributes: props.model.promptForAttributes,
        });
      });
    });

    props.localObserver.subscribe("feature-deleted-by-user", (message) => {
      props.model.getAreaAndAffectedEstates((r) => {
        this.setState({
          contractInformation: r,
          editFeatureId: props.model.editFeatureId,
          promptForAttributes: props.model.promptForAttributes,
        });
      });
    });

    props.localObserver.subscribe("feature-selected-for-edit", (message) => {
      this.setState({
        editFeatureId: this.props.model.editFeatureId,
      });
    });

    props.localObserver.subscribe("edit-feature-reset", (message) => {
      this.setState({
        editFeatureId: undefined,
      });
    });
  }

  setAttributesActive = () => {
    const { editFeatureId, promptForAttributes } = this.state;

    return editFeatureId && promptForAttributes;
  };

  calculateContractInfo = () => {
    this.props.model.getAreaAndAffectedEstates((r) => {
      this.setState({
        contractInformation: r,
      });
    });
  };

  renderEstateList = () => {
    const { contractInformation } = this.state;
    const { classes } = this.props;
    if (contractInformation && contractInformation.affectedEstates) {
      return (
        <List dense={true}>
          {contractInformation.affectedEstates.map((estate, index) => {
            console.log("estate: ", estate);
            return (
              <ListItem key={index}>
                <ListItemText
                  primary={estate.estateName}
                  disableTypography={true}
                  secondary={
                    <div>
                      <div>
                        <Typography
                          variant="caption"
                          className={classes.affectedEstateDetails}
                        >{`Total area: ${estate.estateArea.toLocaleString(
                          "sv-SE"
                        )} m2`}</Typography>
                      </div>
                      <div>
                        <Typography
                          variant="caption"
                          className={classes.affectedEstateDetails}
                        >{`Berörd area: ${estate.affectedArea.toLocaleString(
                          "sv-SE"
                        )} m2`}</Typography>
                      </div>
                      <div>
                        <Typography
                          variant="caption"
                          className={classes.affectedEstateDetails}
                        >{`Berörd andel: ${Math.ceil(
                          (estate.affectedArea / estate.estateArea) * 100
                        )}%`}</Typography>
                      </div>
                    </div>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      );
    }
  };

  renderAffectedEstates = () => {
    const { model, classes } = this.props;

    if (
      model.markisParameters.userMode === "Create" &&
      !this.setAttributesActive()
    ) {
      return (
        <div className={classes.root}>
          <Tooltip title="Klicka här för att se vilka (och till hur stor area) fastigheter som avtalsytorna påverkar.">
            <Accordion onClick={this.calculateContractInfo}>
              <StyledAccordionSummary
                expandIcon={<ExpandMoreIcon />}
                className={classes.styledAccordion}
                aria-controls="panel1a-content"
                id="panel1a-header"
              >
                <Typography>BERÖRDA FASTIGHETER</Typography>
              </StyledAccordionSummary>
              <AccordionDetails className={classes.details}>
                {this.renderEstateList()}
              </AccordionDetails>
            </Accordion>
          </Tooltip>
        </div>
      );
    } else {
      return <div></div>;
    }
  };

  render() {
    return this.renderAffectedEstates();
  }
}

export default withStyles(styles)(AffectedEstates);
