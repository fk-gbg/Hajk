import React from "react";
import { styled } from "@mui/material/styles";
import { withTheme } from "@emotion/react";
import Typography from "@mui/material/Typography";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Grid from "@mui/material/Grid";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";
import Paper from "@mui/material/Paper";
import WarningIcon from "@mui/icons-material/Warning";
import { IconButton } from "@mui/material";
import Popover from "@mui/material/Popover";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import HajkToolTip from "components/HajkToolTip";

const StyledAccordionDetails = styled(AccordionDetails, {
  shouldForwardProp: (prop) => prop !== "hasError",
})(({ hasError }) => ({
  boxSizing: "border-box",
  padding: 0,
  width: "100%",
  maxWidth: "100%",
  maxHeight: hasError ? "none" : 300,
  overflowX: hasError ? "visible" : "hidden",
  overflowY: hasError ? "visible" : "auto",
}));

const StyledAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  borderTop: `1px solid ${theme.palette.divider}`,
  boxSizing: "border-box",
  color: theme.palette.text.secondary,
  padding: theme.spacing(0, 1.5, 0, 1),
  marginBottom: 0,
  minWidth: 0,
  minHeight: 40,
  maxHeight: 40,
  "&.Mui-expanded": {
    minHeight: 40,
  },
  "& .MuiAccordionSummary-content": {
    margin: 0,
    minWidth: 0,
  },
  "& .MuiAccordionSummary-content.Mui-expanded": {
    margin: 0,
  },
  "& .MuiTypography-root": {
    overflowWrap: "anywhere",
  },
  "& .MuiAccordionSummary-expandIconWrapper": {
    marginRight: theme.spacing(0.5),
  },
}));

const ErrorContainer = styled("div")(({ theme }) => ({
  boxSizing: "border-box",
  padding: theme.spacing(0.5, 1, 1, 0.5),
  maxWidth: "100%",
  minWidth: 0,
  overflowWrap: "anywhere",
  marginBottom: theme.spacing(1),
}));

class AffectedEstates extends React.Component {
  constructor(props) {
    super(props);

    this.state = this.getStateFromModel(props);

    this.subscriptions = [
      props.localObserver.subscribe("create-contract", (_message) => {
        this.updateEstateInfo();
      }),

      props.localObserver.subscribe("feature-modified", (_vectorSource) => {
        this.updateEstateInfo();
      }),

      props.localObserver.subscribe("feature-added", (_message) => {
        this.updateEstateInfo();
      }),

      props.localObserver.subscribe("feature-deleted-by-user", (_message) => {
        this.updateEstateInfo();
      }),

      props.localObserver.subscribe("feature-selected-for-edit", (_message) => {
        this.setState({
          editFeatureId: this.props.model.editFeatureId,
        });
      }),

      props.localObserver.subscribe("edit-feature-reset", (_message) => {
        this.setState({
          editFeatureId: undefined,
        });
      }),
    ];
  }

  componentWillUnmount() {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  getStateFromModel(props) {
    const { model, theme } = props;
    const contractInformation = model.affectedEstateInfo || null;
    const summary = contractInformation
      ? this.checkMissingEstates(contractInformation)
      : null;

    return {
      contractInformation: contractInformation,
      editFeatureId: model.editFeatureId,
      promptForAttributes: model.promptForAttributes,
      color: summary?.color || theme.palette.success.main,
      missingArea: summary?.missingArea || 0,
      anchorEl: null,
      status: summary?.status || "success",
    };
  }

  checkMissingEstates = (result) => {
    const { theme } = this.props;
    if (result.error) {
      return {
        color: theme.palette.error.main,
        missingArea: 0,
        status: "error",
      };
    }

    let totalEstateArea = 0;
    if (result.affectedEstates) {
      result.affectedEstates.map((estate) => {
        return (totalEstateArea += estate.affectedArea);
      });

      let dif = 0;

      if (result.totalArea > 0) {
        dif = (result.totalArea - totalEstateArea) / result.totalArea;
      }

      if (dif < 0.05) {
        return {
          color: theme.palette.success.main,
          missingArea: result.totalArea - totalEstateArea,
          status: "success",
        };
      } else {
        return {
          color: theme.palette.warning.main,
          missingArea: result.totalArea - totalEstateArea,
          status: "warning",
        };
      }
    }
  };

  updateEstateInfo = () => {
    const { model } = this.props;
    model.getAreaAndAffectedEstates((r) => {
      let missingSummary = this.checkMissingEstates(r);
      model.affectedEstateInfo = r;
      this.setState({
        contractInformation: r,
        editFeatureId: model.editFeatureId,
        promptForAttributes: model.promptForAttributes,
        color: missingSummary?.color || this.props.theme.palette.success.main,
        missingArea: missingSummary?.missingArea || 0,
        status: missingSummary?.status || "success",
      });
    });
  };

  setAttributesActive = () => {
    const { editFeatureId, promptForAttributes } = this.state;

    return editFeatureId && promptForAttributes;
  };

  getAccordionStyle = () => {
    const { theme } = this.props;
    return {
      boxSizing: "border-box",
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      borderLeft: `${theme.spacing(1.5)} solid ${this.state.color}`,
    };
  };

  togglePopover = (e) => {
    this.setState({
      anchorEl: this.state.anchorEl ? null : e.currentTarget,
    });
  };

  renderWarningIcon = () => {
    return (
      <HajkToolTip title="Berörda fastigheter verkar saknas i markis">
        <IconButton
          onClick={(e) => {
            this.togglePopover(e);
          }}
          size="large"
        >
          <WarningIcon />
        </IconButton>
      </HajkToolTip>
    );
  };

  renderCorrectIcon = () => {
    return (
      <HajkToolTip title="Avtalsytorna ser okej ut!">
        <IconButton
          onClick={(e) => {
            this.togglePopover(e);
          }}
          size="large"
        >
          <ThumbUpIcon style={{ color: this.state.color }} fontSize="small" />
        </IconButton>
      </HajkToolTip>
    );
  };

  renderInformationText = () => {
    const { status } = this.state;
    if (status === "success") {
      return (
        <Typography>
          Avtalsgeometrierna ser bra ut och är redo att sparas! <br /> <br />
          Bra jobbat!
        </Typography>
      );
    } else if (status === "warning") {
      return (
        <Typography>
          Den sammanlagda arean på de ritade avtalsgeometrierna stämmer ej
          överens med den totala arean på de berörda fastigheterna. (Differensen
          är större än 5% av avtalsgeometriernas storlek). <br /> <br />
          Förmodligen beror detta på att fastigheten saknas i MARKIS. <br />{" "}
          <br />
          Försäkra dig om att de ritade avtalsgeometrierna ligger på de
          fastigheter som du ämnade.
          <br /> <br />
          Differensen är beräknad till:{" "}
          {this.state.missingArea.toLocaleString("sv-SE")} m2.
        </Typography>
      );
    }
  };

  renderPopover = () => {
    const { theme } = this.props;
    const { color, anchorEl } = this.state;
    const id = this.state.anchorEl ? "simple-popper" : undefined;
    return (
      <Popover
        id={id}
        open={Boolean(anchorEl)}
        onClose={(e) => {
          this.togglePopover(e);
        }}
        anchorEl={anchorEl}
      >
        <Paper
          style={{
            border: `${theme.spacing(0.1)} solid ${color}`,
            padding: theme.spacing(1),
            maxWidth: 300,
          }}
          elevation={3}
        >
          {this.renderInformationText()}
        </Paper>
      </Popover>
    );
  };

  renderEstateList = () => {
    const { contractInformation } = this.state;
    const { theme } = this.props;
    if (!contractInformation) {
      return null;
    }
    if (contractInformation.affectedEstates) {
      return (
        <List
          dense={true}
          style={{
            width: "100%",
            maxWidth: "100%",
            paddingTop: 0,
            paddingBottom: 0,
          }}
        >
          <ListItem
            key={"total"}
            style={{
              borderTop: `${theme.spacing(0.1)} solid ${this.state.color}`,
              borderBottom: `${theme.spacing(0.1)} solid ${this.state.color}`,
              borderRight: `${theme.spacing(0.1)} solid ${this.state.color}`,
            }}
            align="flex-start"
          >
            <ListItemText
              primary={`Avtal: ${contractInformation.objectId}`}
              disableTypography={true}
              secondary={
                <div>
                  <div>
                    <Typography variant="caption">{`Händelse: ${contractInformation.objectSerial}`}</Typography>
                  </div>
                  <div>
                    <Typography variant="caption">{`Total area: ${contractInformation.totalArea.toLocaleString(
                      "sv-SE"
                    )} m2 ~${(contractInformation.totalArea / 10000).toFixed(
                      2
                    )} ha`}</Typography>
                  </div>
                </div>
              }
            ></ListItemText>
            {this.state.status === "warning"
              ? this.renderWarningIcon()
              : this.renderCorrectIcon()}
          </ListItem>
          {contractInformation.affectedEstates.map((estate, index) => {
            return (
              <ListItem key={index} align="flex-start">
                <ListItemText
                  primary={estate.estateName}
                  disableTypography={true}
                  secondary={
                    <div>
                      <div>
                        <Typography variant="caption">{`Total area: ${estate.estateArea.toLocaleString(
                          "sv-SE"
                        )} m2`}</Typography>
                      </div>
                      <div>
                        <Typography variant="caption">{`Berörd area: ${estate.affectedArea.toLocaleString(
                          "sv-SE"
                        )} m2`}</Typography>
                      </div>
                      <div>
                        <Typography variant="caption">{`Berörd andel: ${Math.ceil(
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
    if (contractInformation.error) {
      return (
        <ErrorContainer>
          <Paper
            style={{
              boxSizing: "border-box",
              border: `${theme.spacing(0.1)} solid ${this.state.color}`,
              padding: theme.spacing(0.5),
              marginRight: theme.spacing(1),
              maxWidth: `calc(100% - ${theme.spacing(1)})`,
              minWidth: 0,
              width: `calc(100% - ${theme.spacing(1)})`,
            }}
            elevation={0}
          >
            <Grid
              sx={{
                alignItems: "center",
                display: "flex",
                gap: theme.spacing(0.5),
                justifyContent: "center",
                marginBottom: theme.spacing(0.25),
              }}
            >
              <Typography variant="subtitle2">Ojdå...</Typography>
              <SentimentVeryDissatisfiedIcon fontSize="small" />
            </Grid>
            <Typography
              align="center"
              variant="caption"
              component="p"
              sx={{ lineHeight: 1.2, margin: 0, overflowWrap: "anywhere" }}
            >
              Någon av de ritade geometrierna innehåller fel. Berörda
              fastigheter kan ej beräknas. Rätta eller ta bort geometrierna och
              försök igen.
            </Typography>
          </Paper>
        </ErrorContainer>
      );
    }
  };

  renderAffectedEstates = () => {
    const { model } = this.props;
    const hasError =
      this.state.contractInformation && this.state.contractInformation.error;

    if (
      model.markisParameters.userMode === "Create" &&
      !this.setAttributesActive()
    ) {
      return (
        <div style={this.getAccordionStyle()}>
          <Accordion elevation={0}>
            <HajkToolTip title="Klicka här för att se vilka (och till hur stor area) fastigheter som avtalsytorna påverkar.">
              <StyledAccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="panel1a-content"
                id="panel1a-header"
              >
                <Typography>BERÖRDA FASTIGHETER</Typography>
              </StyledAccordionSummary>
            </HajkToolTip>
            <StyledAccordionDetails hasError={hasError}>
              {this.renderEstateList()}
            </StyledAccordionDetails>
          </Accordion>
          {this.renderPopover()}
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

export default withTheme(AffectedEstates);
