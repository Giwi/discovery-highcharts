import { ChartType, ColorLib, DataModel, DiscoveryEvent, GTSLib, Logger, Param, Utils } from '@senx/discovery-widgets';
import { Component, Element, Event, EventEmitter, h, Host, Listen, Method, Prop, State, Watch } from '@stencil/core';
import { v4 } from 'uuid';
import HighCharts from 'highcharts/highstock';

@Component({
  tag: 'kwh50-line',
  styleUrl: 'kwh50-line.css',
  shadow: true,
})
export class Kwh50Line {
  @Prop() result: DataModel | string; // mandatory, will handle the result of a Warp 10 script execution
  @Prop() options: Param | string = new Param(); // mandatory, will handle dashboard and tile option
  @State() @Prop() width: number; // optionnal
  @State() @Prop({ mutable: true }) height: number; // optionnal, mutable because, in this tutorial, we compute it
  @Prop() debug: boolean = false; // optionnal, handy if you want to use the Discovery Logger

  @Event() draw: EventEmitter<void>; // mandatory

  @Element() el: HTMLElement;

  @State() innerOptions: Param; // will handle merged options
  @State() innerResult: DataModel; // will handle the parsed execution result

  private LOG: Logger; // The Discovery Logger
  private divider: number = 1000; // Warp 10 time unit divider
  private chartElement: HTMLCanvasElement; // The chart area
  private innerStyles: any = {}; // Will handle custom CSS styles for your tile
  private myChart: HighCharts.StockChart; // The Highcharts instance
  private uuid = v4(); // Unique id for this chart

  /************************************************************
   *********************** Watchers ****************************
   ************************************************************/

  /*
   * Called when the result is updated
   */
  @Watch('result') // mandatory
  updateRes(newValue: DataModel | string, oldValue: DataModel | string) {
    if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
      this.innerResult = GTSLib.getData(this.result);
      setTimeout(() => this.drawChart()); // <- we will see this function later
    }
  }

  /*
   * Called when the options are updated
   */
  @Watch('options') // mandatory
  optionsUpdate(newValue: string, oldValue: string) {
    if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
      if (!!this.options && typeof this.options === 'string') {
        this.innerOptions = JSON.parse(this.options);
      } else {
        this.innerOptions = { ...(this.options as Param) };
      }
      setTimeout(() => this.drawChart());
    }
  }

  /************************************************************
   *********************** Methods ****************************
   ************************************************************/

  /*
   * Mandatory
   * Called by Discovery when the component must be resized
   */
  @Method()
  async resize() {
    if (!!this.myChart) {
      this.myChart.reflow();
    }
  }

  /*
   * Optionnal
   * Called by Discovery when the component has to export its content to PNG or SVG
   */
  @Method()
  async export(type: 'png' | 'svg' = 'png') {
    console.log('Exporting chart to ' + type);
  }

  /************************************************************
   ******************* Events Handlers ************************
   ************************************************************/

  /* Handy if you want to handle Discovery events coming from other tiles */
  @Listen('discoveryEvent', { target: 'window' })
  discoveryEventHandler(event: CustomEvent<DiscoveryEvent>) {
    const res = Utils.parseEventData(event.detail, this.innerOptions.eventHandler, this.uuid);
    if (res.data) {
      this.innerResult = res.data;
      setTimeout(() => this.drawChart());
    }
    if (res.style) {
      this.innerStyles = { ...this.innerStyles, ...(res.style as { [k: string]: string }) };
    }
  }

  /************************************************************
   ********************* L0gic Part ***************************
   ************************************************************/

  drawChart() {
    // Merge options
    let options = Utils.mergeDeep<Param>(this.innerOptions || ({} as Param), this.innerResult.globalParams) as Param;
    this.innerOptions = { ...options };

    // Flatten the data structure and add an id to GTS
    const gtsList = GTSLib.flattenGtsIdArray(this.innerResult.data as any[], 0).res;

    console.log(gtsList);

    this.myChart = HighCharts.chart(this.chartElement, {
      chart: {
        type: 'line',
      },
      title: {
        text: 'My chart',
      },
      xAxis: {
        type: 'datetime',
        title: {
          text: 'Time',
        },
      },
      yAxis: {
        title: {
          text: 'Value',
        },
      },
      series: [
        {
          type: 'line',
          name: 'My serie',
          data: [{x: 1, y: 2}, {x: 2, y: 3}, {x: 3, y: 4}],
        },
      ],
    });

    this.myChart.redraw();
  }

  /************************************************************
   ********************* Life Cycle ***************************
   ************************************************************/

  /*
   * Mandatory
   * Part of the lifecycle
   */
  componentWillLoad() {
    //Chart.register(...registerables); // ChartJS specific loading
    this.LOG = new Logger(Kwh50Line, this.debug); // init the Discovery Logger
    // parse options
    if (typeof this.options === 'string') {
      this.innerOptions = JSON.parse(this.options);
    } else {
      this.innerOptions = this.options;
    }
    // parse result
    this.innerResult = GTSLib.getData(this.result);
    this.divider = GTSLib.getDivider(this.innerOptions.timeUnit || 'us'); // Warp 10 default time unit
    // Get tile dimensions of the container
    const dims = Utils.getContentBounds(this.el.parentElement);
    this.width = dims.w;
    this.height = dims.h;
  }

  /*
   * Mandatory
   * Part of the lifecycle
   */
  componentDidLoad() {
    setTimeout(() => this.drawChart());
  }

  /*
   * Mandatory
   * Render the content of the component
   */
  render() {
    return (
      <div>
        <div class="chart-container">{this.innerResult ? <canvas id="myChart" ref={el => (this.chartElement = el as HTMLCanvasElement)}></canvas> : ''}</div>
      </div>
    );
  }
}
