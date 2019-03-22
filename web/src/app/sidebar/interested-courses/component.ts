import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { SidebarService } from '../../services/sidebar.service';
import { ConflictsService } from '../../services/conflicts.service';
import { SelectedTermService } from '../../services/selected-term.service';
// import { Course } from '../../models/course.model';
import { Term, Listing } from 'yacs-api-client';
import 'rxjs/Rx';
import {Subject, Subscription} from 'rxjs/Rx';
import * as domtoimage from 'dom-to-image';
import {SelectionService} from '../../services/selection.service';

@Component({
  selector: 'interested-courses',
  templateUrl: './component.html',
  styleUrls: ['./component.scss']
})

export class InterestedCoursesComponent implements OnInit {

  listings: Listing[] = [];
  isLoaded: boolean = false;
  private listingIds: Array<string>;
  private subscription;

  @Input() showStatusText: boolean = false;

  constructor (
      private selectionService: SelectionService,
      private conflictsService: ConflictsService,
      private selectedTermService: SelectedTermService) {
    this.subscription = this.selectionService.subscribeToSelections(() => {
      this.getCourses();
    });
  }

  ngOnInit () {
    this.listingIds = new Array<string>();
    this.getCourses();
  }

  get isActiveTerm(): boolean {
    return this.selectedTermService.isCurrentTermActive;
  }

  private getCourses () {
    this.listingIds = this.selectionService.getSelectedListingIds();

    // display interested courses on sidebar
    // display message to try selecting some if none

    if (this.listingIds.length > 0) {
      this.showStatusText = false;
      this.isLoaded = false;
      Listing
        .where({ id: this.listingIds })
        .includes('sections')
        .includes('sections.listing')
        .includes('course')
        .includes('course.subject')
        .all().then((listings) => {
          this.listings = listings.data;
          this.conflictsService.populateConflictsCache(this.listings);
          this.isLoaded = true;
        });
    } else {
      this.showStatusText = true;
    }
  }
}
