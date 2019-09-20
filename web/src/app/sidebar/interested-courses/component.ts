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

  @Input() isEmpty: boolean = false;

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

  private getCourses () {
    this.listingIds = this.selectionService.getSelectedListingIds();

    // display interested courses on sidebar
    // display message to try selecting some if none
    if (this.listingIds.length > 0) {
      this.isEmpty = false;
      this.isLoaded = false;
      Listing
        .where({ id: this.listingIds })
        .includes('sections')
        .includes('sections.listing')
        .includes('course')
        .includes('course.subject')
        .all().then((newListings) => {
          // Create sets from the ids of the two arrays to check for memebership
          // This allows the runtime to be linear
          let oldListingsSet =  new Set(this.listings.map((listing) => listing.id));
          let newListingsSet = new Set(newListings.data.map((newListing) => newListing.id));

          // Iterate over new listings, and add each new listing if it is not already
          // present in the current listings
          newListings.data.forEach((newListing) => {
            let inCurList: boolean  = oldListingsSet.has(newListing.id);

            if (!inCurList) {
              this.listings.push(newListing);
            }
          });

          // Remove listings that are not in the array of new listings
          this.listings.forEach((listing, index) => {
            let removeCurList: boolean = !newListingsSet.has(listing.id);

            if (removeCurList) {
              this.listings.splice(index, 1);
            }
          });

          this.conflictsService.populateConflictsCache(this.listings);
          this.isLoaded = true;
        });
    } else {
      this.isEmpty = true;
    }
  }
}
