import React from "react";
import ToggleButton from "@material-ui/lab/ToggleButton";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import Grid from "@material-ui/core/Grid";
import EditIcon from "@material-ui/icons/Edit";
import FormatShapesIcon from "@material-ui/icons/FormatShapes";
import TuneIcon from "@material-ui/icons/Tune";
import DeleteIcon from "@material-ui/icons/Delete";
import TimelineIcon from "@material-ui/icons/Timeline";
import TouchAppIcon from "@material-ui/icons/TouchApp";
import Tooltip from "@material-ui/core/Tooltip";
import Button from "@material-ui/core/Button";
import { withStyles } from "@material-ui/core/styles";
import SaveIcon from "@material-ui/icons/Save";
import CancelIcon from "@material-ui/icons/Cancel";
import { Typography } from "@material-ui/core";

const styles = (theme) => ({
  container: {
    display: "flex",
    flexWrap: "wrap",
  },
  text: {
    marginLeft: theme.spacing(1),
    display: "flex",
    flexWrap: "wrap",
  },
  createButtons: {
    margin: theme.spacing(1),
    width: 100,
  },
  clearSearchButton: {
    margin: theme.spacing(1),
    width: 100,
    textAlign: "center",
  },
  styledButtonGroup: {
    margin: theme.spacing(0),
    display: "flex",
    width: "100%",
  },
  styledToggleButton: {
    width: "100%",
    color: theme.palette.text.secondary,
    justifyContent: "left",
  },
  centerElements: {
    textAlign: "center",
    position: "absolute",
    bottom: theme.spacing(1),
    width: "100%",
  },
  toolIcons: {
    paddingRight: theme.spacing(0.5),
  },
});

const StyledToggleButtonGroup = withStyles((theme) => ({
  grouped: {
    borderRight: "none",
    borderLeft: "none",
    borderRadius: 0,
  },
}))(ToggleButtonGroup);

class Toolbar extends React.Component {
  state = {
    createMethod: "abort",
    featuresExist: false,
    editFeatureId: undefined,
    allowLine: true,
    allowPolygon: true,
    promptForAttributes: false,
    featureModified: false,
    editingExisting: false,
  };

  constructor(props) {
    super(props);

    props.observer.subscribe("create-contract", (message) => {
      this.setState({
        featuresExist: props.model.geometriesExist,
        editFeatureId: props.model.editFeatureId,
        featureModified: props.model.featureModified,
        editingExisting: props.model.editingExisting,
        allowLine:
          props.model.editSource.allowedGeometries.indexOf("Line") > -1,
        allowPolygon:
          props.model.editSource.allowedGeometries.indexOf("Polygon") > -1,
        promptForAttributes: props.model.promptForAttributes,
      });
    });

    props.observer.subscribe("feature-modified", (vectorSource) => {
      this.setState({
        featureModified: props.model.featureModified,
      });
    });

    props.observer.subscribe("feature-added", (message) => {
      this.setState({
        editFeatureId: this.props.model.editFeatureId,
        featuresExist: true,
        featureModified: true,
      });
    });

    props.observer.subscribe("feature-deleted-by-user", (message) => {
      this.setState({
        featuresExist: this.props.model.geometriesExist,
        featureModified: true,
      });
    });

    props.observer.subscribe("editing-existing-contract", (message) => {
      this.setState({
        editingExisting: true,
        featuresExist: true,
      });
    });

    props.observer.subscribe("feature-selected-for-edit", (message) => {
      this.setState({
        editFeatureId: this.props.model.editFeatureId,
      });
    });

    props.observer.subscribe("edit-feature-reset", (message) => {
      this.setState({
        editFeatureId: undefined,
        featureModified: true,
      });
    });
  }

  abortCreation = () => {
    this.props.panel.reset();
  };

  saveCreated = () => {
    const { model } = this.props;
    if (model.markisParameters.type !== "Contract") {
      if (!model.validateTradeGeometries()) {
        this.props.messageHandler(
          "Du måste ange diarienummer och fastighetsnummer innan du sparar!",
          "error"
        );
        return;
      }
    }
    model.invokeCompleteMessage((done) => {
      if (done.error) {
        this.props.messageHandler(
          "Geometrierna gick inte att spara då de innehöll self-intersects."
        );
        this.props.panel.reset();
      } else {
        model.save((r) => {
          if (r && r.TransactionResponse.TransactionSummary) {
            if (
              Number(
                r.TransactionResponse.TransactionSummary.totalInserted.toString()
              ) > 0
            ) {
              this.props.messageHandler(
                "Geometrin skapades utan problem!",
                "success"
              );
              model.refreshLayersByIds(model.editSource.activeLayers);
              this.props.panel.reset();
            } else if (
              Number(
                r.TransactionResponse.TransactionSummary.totalUpdated.toString()
              ) > 0
            ) {
              this.props.messageHandler(
                "Geometrin uppdaterades utan problem!",
                "success"
              );
              model.refreshLayersByIds(model.editSource.activeLayers);
              this.props.panel.reset();
            } else if (
              Number(
                r.TransactionResponse.TransactionSummary.totalDeleted.toString()
              ) > 0
            ) {
              this.props.messageHandler(
                "Geometrin togs bort utan problem.",
                "success"
              );
              model.refreshLayersByIds(model.editSource.activeLayers);
              this.props.panel.reset();
            } else {
              this.props.messageHandler(
                "Geometrin gick inte att spara. Försök igen senare."
              );
              this.props.panel.reset();
            }
          } else {
            this.props.messageHandler(
              "Geometrin gick inte att spara. Fösök igen senare."
            );
            this.props.panel.reset();
          }
        });
      }
    });
  };

  clearSearchResult = () => {
    this.props.model.clearSearchResult();
  };

  handleChange = (name) => (event) => {
    if (this.state[name] === event.currentTarget.value) {
      this.setState({ [name]: undefined });
      this.props.model.setCreateMethod("abort");
    } else {
      this.setState({ [name]: event.currentTarget.value });
      this.props.model.setCreateMethod(event.currentTarget.value);
    }
  };

  renderButtons() {
    const { classes, model } = this.props;
    const editTools = (
      <Grid container direction="column" alignItems="center">
        <StyledToggleButtonGroup
          orientation="vertical"
          className={classes.styledButtonGroup}
          size="small"
          exclusive
          onChange={this.handleChange("createMethod")}
          value={this.state.createMethod}
        >
          <ToggleButton
            className={classes.styledToggleButton}
            key={1}
            value="add"
            disabled={!this.state.allowPolygon}
          >
            <Tooltip title="Klicka på första punkten där du vill skapa en nod, och fortsätt klicka en gång per ny nod. Avsluta med dubbelklick.">
              <span style={{ display: "flex" }}>
                <FormatShapesIcon size="small" className={classes.toolIcons} />
                <Typography>SKAPA YTA</Typography>
              </span>
            </Tooltip>
          </ToggleButton>

          <ToggleButton
            className={classes.styledToggleButton}
            disabled={!this.state.allowLine}
            key={2}
            value="addLine"
          >
            <Tooltip title="Klicka på första punkten där du vill skapa en nod, och fortsätt klicka en gång per ny nod. Avsluta med dubbelklick.">
              <span style={{ display: "flex" }}>
                <TimelineIcon className={classes.toolIcons} />
                <Typography>SKAPA LINJE</Typography>
              </span>
            </Tooltip>
          </ToggleButton>
          <ToggleButton
            className={classes.styledToggleButton}
            key={3}
            value="addEstate"
            disabled={!this.state.allowPolygon}
          >
            <Tooltip title="För att kopiera en befintlig yta, säkerställ att lagret du vill kopiera en yta ifrån är tänt i lagerhanteraren (syns även som flik längst ner i kartan) och att objektet inte täcks av objekt från något annat lager (gäller ej bakgrundskartor). Släck annars lagret (räcker ej att klicka på ögat). Så snart du har valt ett objekt kopplas det till det avtal du redigerar.">
              <span style={{ display: "flex" }}>
                <TouchAppIcon className={classes.toolIcons} />
                <Typography>VÄLJ YTA</Typography>
              </span>
            </Tooltip>
          </ToggleButton>
          <ToggleButton
            className={classes.styledToggleButton}
            key={4}
            disabled={!this.state.featuresExist}
            value="edit"
          >
            <Tooltip title="För att redigera en geometri; klicka på verktyget och dra sedan i noderna.">
              <span style={{ display: "flex" }}>
                <EditIcon className={classes.toolIcons} />
                <Typography>REDIGERA</Typography>
              </span>
            </Tooltip>
          </ToggleButton>
          <ToggleButton
            className={classes.styledToggleButton}
            key={5}
            disabled={!this.state.featuresExist}
            value="remove"
            title="Ta bort ett objekt genom att markera det i kartan."
          >
            <Tooltip title="Om du vill radera en yta kan du använda Radera-verktyget. Aktivera verktyget i menyn och klicka sedan på den yta du vill ta bort. För att ytan skall försvinna från Markis måste du klicka på spara när du är klar. OBS: Du kan enbart radera ytor kopplade till det avtal du arbetar med.">
              <span style={{ display: "flex" }}>
                <DeleteIcon className={classes.toolIcons} />
                <Typography>RADERA</Typography>
              </span>
            </Tooltip>
          </ToggleButton>
          <ToggleButton
            className={classes.styledToggleButton}
            disabled={!model.promptForAttributes || !this.state.featuresExist}
            key={6}
            value="editAttributes"
            title="Ändra ytans attribut genom att markera den i kartan."
          >
            <Tooltip title="Om du vill ändra attribut på en yta kan du använda Ändra attribut-verktyget. Aktivera verktyget i menyn och klicka sedan på den yta du vill redigera. För att ytan skall uppdateras måste du klicka på spara när du är klar.">
              <span style={{ display: "flex" }}>
                <TuneIcon className={classes.toolIcons} />
                <Typography>ÄNDRA ATTRIBUT</Typography>
              </span>
            </Tooltip>
          </ToggleButton>
        </StyledToggleButtonGroup>
      </Grid>
    );

    const btnSave = (
      <Tooltip title="Spara och stäng.">
        <span>
          <Button
            variant="contained"
            color="primary"
            size="small"
            className={classes.createButtons}
            onClick={this.saveCreated}
            startIcon={<SaveIcon />}
            disabled={
              !(this.state.featuresExist && !this.state.editingExisting) &&
              !(this.state.featureModified && this.state.editingExisting)
            }
          >
            <Typography>Spara</Typography>
          </Button>
        </span>
      </Tooltip>
    );

    const btnAbort = (
      <Tooltip title="Avbryt pågående arbete.">
        <span>
          <Button
            variant="contained"
            size="small"
            className={classes.createButtons}
            onClick={this.abortCreation}
            startIcon={<CancelIcon />}
          >
            <Typography>Avbryt</Typography>
          </Button>
        </span>
      </Tooltip>
    );

    const btnRemoveSearchResult = (
      <Tooltip title="Rensa bort sökresultat från kartan.">
        <span>
          <Button
            variant="contained"
            className={classes.createButtons}
            onClick={this.clearSearchResult}
            disabled={!model.markisParameters.objectId}
          >
            <Typography>Rensa</Typography>
          </Button>
        </span>
      </Tooltip>
    );

    if (
      !(this.props.model.editFeatureId && this.props.model.promptForAttributes)
    ) {
      if (model.markisParameters.userMode === "Create") {
        return (
          <div>
            <div>{editTools}</div>
            <div className={classes.centerElements}>
              {btnAbort}
              {btnSave}
            </div>
          </div>
        );
      } else {
        if (model.markisParameters.objectId) {
          return (
            <div className={classes.centerElements}>
              {btnRemoveSearchResult}
            </div>
          );
        } else {
          return null;
        }
      }
    } else {
      return null;
    }
  }

  render() {
    return this.renderButtons();
  }
}

export default withStyles(styles)(Toolbar);
