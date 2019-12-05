import { environment } from 'environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

import 'rxjs/add/operator/map';
import { tap, finalize } from 'rxjs/operators';
import { Client } from 'elasticsearch-browser';
import { SnpPage } from '../models/page';

@Injectable({
    providedIn: 'root',
})
export class SnpService {
    snpResultsSize = environment.snpResultsSize;
    onSnpsChanged: BehaviorSubject<SnpPage>;
    onSnpChanged: BehaviorSubject<any>;
    onSnpsDownloadReady: BehaviorSubject<any>;
    loading = false;
    downloadId;

    private client: Client;
    inputType: any = {
        chromosome: {
            id: 1,
            label: 'Chromosome'
        }, chromosomeList: {
            id: 2,
            label: 'Variants List'
        }, geneProduct: {
            id: 3,
            label: 'Gene Product'
        }, rsID: {
            id: 4,
            label: 'rsID or variant id'
        }
    };

    inputTypes: any = {
        options: [
            this.inputType.chromosome,
            this.inputType.chromosomeList,
            this.inputType.geneProduct,
            this.inputType.rsID
        ]
    };

    constructor(private httpClient: HttpClient) {
        this.onSnpsChanged = new BehaviorSubject(null);
        this.onSnpsDownloadReady = new BehaviorSubject(null);
        this.onSnpChanged = new BehaviorSubject(null);
        this.inputTypes.selected = this.inputTypes.options[0];

        if (!this.client) {
            this._connect();
        }
    }

    selectInputType(inputType) {
        this.inputTypes.selected = inputType;
    }

    getSnps(annotationQuery: any, page: number): any {
        const self = this;
        self.loading = true;

        const query = {
            '_source': annotationQuery.source,
            'query': {
                'bool': {
                    'filter': [
                        { 'term': { 'chr': annotationQuery.chrom } },
                        { 'range': { 'pos': { 'gte': annotationQuery.start, 'lte': annotationQuery.end } } }]
                }
            },
        };

        switch (this.inputTypes.selected) {
            case this.inputType.chromosome:
                break;
            case this.inputType.geneProduct:
                break;
            case this.inputType.rsID:
                break;
            case this.inputType.chromosomeList:
                break;
        }

        return self.getSnpsPage(query, page);
    }

    getSnpsPage(query: any, page: number): any {
        const self = this;
        self.loading = true;

        return this.client.search({
            from: (page - 1) * this.snpResultsSize,
            size: this.snpResultsSize,
            body: query
        }).then((body) => {
            if (body.hits.total.value > 0) {
                const snpPage = new SnpPage();
                const esData = body.hits.hits as [];
                const snpData = esData.map((snp: any) => {
                    return snp._source;
                });

                snpPage.query = query;
                snpPage.total = body.hits.total.value;
                snpPage.size = self.snpResultsSize;
                snpPage.snps = snpData;
                snpPage.source = query._source;

                this.onSnpsChanged.next(snpPage);
            } else {
                this.onSnpsChanged.next(null);
            }
            self.loading = false;
        }, (err) => {
            self.loading = false;
        });
    }

    downloadSnp() {
        if (!this.downloadId) { return; }

        const url = `${environment.annotationApi}/total_res/${this.downloadId}`;

        this.httpClient.get(url)
            .subscribe((response) => {
                this.onSnpsDownloadReady.next(response);
            });
    }

    isAvailable(): any {
        return this.client.ping({
            requestTimeout: Infinity,
            body: 'Hello JOAC Search!'
        });
    }

    private _connect() {
        this.client = new Client({ host: environment.annotationApi });
    }

}
