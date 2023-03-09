import React from "react";
import { createPortal } from "react-dom";
import { IconButton, Grid, Typography, Tooltip } from "@mui/material";
import Slider from "@mui/material/Slider";
import { styled } from "@mui/material/styles";
import { withTheme } from "@emotion/react";
import PaletteIcon from "@mui/icons-material/Palette";
import Dialog from "../../../components/Dialog/Dialog";
import { SketchPicker } from "react-color";

const ColorPickerContainer = styled(Grid)(({ theme }) => ({
  padding: theme.spacing(2),
  paddingTop: 0,
}));

class RGBA {
  static toString(o) {
    return `rgba(${o.r},${o.g},${o.b},${o.a})`;
  }

  static parse(s) {
    try {
      // 1. RegEx that matches stuff between a set of parentheses
      // 2. Execute that regex on the input string, but first remove any whitespace it may contain
      // 3. RegEx exec returns an array. Grab the second element, which will contain the value.
      // 4. Split the value to extract individual rgba values
      const o = /\(([^)]+)\)/.exec(s.replace(/\s/g, ""))[1].split(",");
      return {
        r: o[0],
        g: o[1],
        b: o[2],
        a: o[3],
      };
    } catch (error) {
      console.error("RGBA parsing failed: " + error.message);
    }
  }
}

class FeatureStyleChanger extends React.Component {
  state = {
    dialogOpen: false,
    strokeColor: "rgba(255, 0, 0, 1)",
    fillColor: "rgba(200, 0, 0, 0.1)",
    strokeWidth: 2,
  };

  handleColorChange = (target, color) => {
    this.setState({ [target]: RGBA.toString(color.rgb) }, () => {
      this.updateStyle();
    });
  };

  handleStrokeWidthChange = (width) => {
    this.setState({ strokeWidth: width }, () => {
      this.updateStyle();
    });
  };

  updateStyle = () => {
    const { strokeColor, fillColor, strokeWidth } = this.state;
    const { model } = this.props;
    model.updateFeatureStyle(strokeColor, fillColor, strokeWidth);
  };

  renderFeatureStyleToggler = () => {
    const { strokeColor, fillColor, strokeWidth } = this.state;
    return (
      <Grid container item alignItems="center" xs={12}>
        <ColorPickerContainer container item xs={6}>
          <Grid item xs={12}>
            <Typography gutterBottom>Kantlinjefärg</Typography>
          </Grid>
          <Grid item xs={12}>
            <SketchPicker
              color={RGBA.parse(strokeColor)}
              onChangeComplete={(color) =>
                this.handleColorChange("strokeColor", color)
              }
            />
          </Grid>
        </ColorPickerContainer>
        <ColorPickerContainer container item xs={6}>
          <Grid item xs={12}>
            <Typography gutterBottom>Fyllnadsfärg</Typography>
          </Grid>
          <Grid item xs={12}>
            <SketchPicker
              color={RGBA.parse(fillColor)}
              onChangeComplete={(color) =>
                this.handleColorChange("fillColor", color)
              }
            />
          </Grid>
        </ColorPickerContainer>
        <Grid item xs={12}>
          <Grid item xs={12}>
            <Typography>{`Linjetjocklek, nu ${strokeWidth}px`}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Slider
              aria-labelledby="stroke-width-picker"
              valueLabelDisplay="auto"
              step={0.5}
              marks
              onChangeCommitted={(e, value) => {
                this.handleStrokeWidthChange(value);
              }}
              value={strokeWidth}
              min={0.5}
              max={5}
            />
          </Grid>
        </Grid>
      </Grid>
    );
  };

  renderFeatureStyleChangerDialog = () => {
    const { dialogOpen } = this.state;

    if (dialogOpen) {
      return createPortal(
        <Dialog
          options={{
            text: this.renderFeatureStyleToggler(),
            headerText: "Ändra stil",
            buttonText: "OK",
            useLegacyNonMarkdownRenderer: true,
          }}
          open={dialogOpen}
          onClose={() => {
            this.setState({
              dialogOpen: false,
            });
          }}
        ></Dialog>,
        document.getElementById("windows-container")
      );
    } else {
      return null;
    }
  };

  render() {
    return (
      <>
        <Tooltip title="Klicka här för att ändra stil på ytorna. OBS: Detta påverkar bara stilen i denna sessionen, och är inget som sparas.">
          <IconButton
            onClick={() =>
              this.setState({ dialogOpen: !this.state.dialogOpen })
            }
            size="small"
          >
            <PaletteIcon />
          </IconButton>
        </Tooltip>
        {this.renderFeatureStyleChangerDialog()}
      </>
    );
  }
}

export default withTheme(FeatureStyleChanger);
