import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Edge, Service, Websocket } from 'src/app/shared/shared';
import { Role } from 'src/app/shared/type/role';
import { Ibn, View } from './installation-systems/abstract-ibn';
import { GeneralIbn } from './installation-systems/general-ibn';

// 'type' especially to store Edge data to later store in Ibn.
export type EdgeData = {
  id: string;
  comment: string;
  producttype: string;
  version: string;
  role: Role;
  isOnline: boolean;
};

export const COUNTRY_OPTIONS: { value: string; label: string }[] = [
  { value: 'de', label: 'Deutschland' },
  { value: 'at', label: 'Österreich' },
  { value: 'ch', label: 'Schweiz' },
];

@Component({
  selector: InstallationComponent.SELECTOR,
  templateUrl: './installation.component.html',
})
export class InstallationComponent implements OnInit {
  private static readonly SELECTOR = 'installation';

  public ibn: Ibn | null = null;
  public progressValue: number;
  public progressText: string;
  public edge: Edge = null;
  public displayedView: View;
  public readonly view = View;
  public spinnerId: string;

  constructor(
    private service: Service,
    private router: Router,
    public websocket: Websocket
  ) { }

  public ngOnInit() {
    this.service.currentPageTitle = 'Installation';
    this.spinnerId = 'installation-websocket-spinner';
    this.service.startSpinner(this.spinnerId);
    let ibn: Ibn = null;
    let viewIndex: number;

    // Ibn data
    if (sessionStorage?.edge) {
      // Recreate edge object to provide the correct
      // functionality of it (the prototype can't be saved as JSON,
      // so it has to get instantiated here again)
      this.edge = new Edge(
        sessionStorage.edge.id,
        sessionStorage.edge.comment,
        sessionStorage.edge.producttype,
        sessionStorage.edge.version,
        sessionStorage.edge.role,
        sessionStorage.edge.isOnline
      );

      // Ibn is added in second view.
      if (sessionStorage.ibn) {
        ibn = JSON.parse(sessionStorage.ibn);
      }
    }

    // Determine view index
    if (sessionStorage?.viewIndex) {
      // 10 is given as radix parameter.
      // 2 = binary, 8 = octal, 10 = decimal, 16 = hexadecimal.
      viewIndex = parseInt(sessionStorage.viewIndex, 10);
    } else {
      viewIndex = 0;
    }

    this.ibn = ibn;

    // Load Ibn with 'General Ibn' data initially.
    if (this.ibn === null) {
      this.setIbnEvent(new GeneralIbn());
    }

    this.displayViewAtIndex(viewIndex);
  }

  /**
   * Sets the Ibn value.
   *
   * @param ibn Ibn data specific to the system.
   */
  public setIbnEvent(ibn: Ibn) {
    this.ibn = ibn;

    if (sessionStorage) {
      sessionStorage.setItem('ibn', JSON.stringify(this.ibn));
    }
  }

  /**
   * Sets the edge data to store in Ibn.
   *
   * @param edge the current edge data.
   */
  public setEdgeEvent(edge: EdgeData) {
    this.edge = new Edge(
      edge.id,
      edge.comment,
      edge.producttype,
      edge.version,
      edge.role,
      edge.isOnline
    );

    if (sessionStorage) {
      sessionStorage.setItem('edge', JSON.stringify(edge));
    }
  }

  /**
   * Determines the index of the current view in Ibn.
   *
   * @param view current view.
   * @returns the index of the current view.
   */
  public getViewIndex(view: View): number {
    return this.ibn.views.indexOf(view);
  }

  /**
   * Displays the view based on the index.
   *
   * @param index index of the desired view.
   */
  public displayViewAtIndex(index: number) {
    const viewCount = this.ibn.views.length;
    if (index >= 0 && index < viewCount) {
      this.displayedView = this.ibn.views[index];
      this.progressValue = viewCount === 0 ? 0 : index / (viewCount - 1);
      this.progressText = 'Schritt ' + (index + 1) + ' von ' + viewCount;

      if (sessionStorage) {
        sessionStorage.setItem('viewIndex', index.toString());
      }

      // When clicking next on the last view
    } else if (index === viewCount) {
      // Navigate to online monitoring of the edge
      this.router.navigate(['device', this.edge.id]);

      // Clear session storage
      sessionStorage.clear();
    } else {
      console.warn('The given view index is out of bounds.');
    }
  }

  /**
   * Displays the previous view.
   */
  public displayPreviousView() {
    this.displayViewAtIndex(this.getViewIndex(this.displayedView) - 1);
  }

  /**
   * Displays the Next view.
   */
  public displayNextView() {
    this.displayViewAtIndex(this.getViewIndex(this.displayedView) + 1);
  }
}
