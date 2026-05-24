import {author} from './author'
import {instagramEmbed} from './instagramEmbed'
import {interview} from './interview'
import {news} from './news'
import {photoPost} from './photoPost'
import {newsletterIssue} from './newsletterIssue'
import {review} from './review'
import {siteSettings} from './siteSettings'
import {tag} from './tag'

export const schemaTypes = [
  siteSettings,
  tag,
  author,
  instagramEmbed,
  interview,
  news,
  newsletterIssue,
  photoPost,
  review,
]
